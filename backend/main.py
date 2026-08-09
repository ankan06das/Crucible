import os
import sys

from dotenv import load_dotenv

load_dotenv()
import datetime
import json
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional  # noqa: UP035

from fastapi import (
    BackgroundTasks,
    FastAPI,
    Header,
    HTTPException,
    Request,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import re

from contextlib import asynccontextmanager

# Add root folder to python path so we can import generator and orchestrator
ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))
sys.path.append(str(Path(__file__).resolve().parent))

from db import get_conn, put_conn, IntegrityError, close_pool

try:
    from generator import generate_candidates, generate_idea
    from orchestrator import run_pipeline
    from schemas.generation import GenerationRequest, GenerationResult
except ModuleNotFoundError:
    # Optional modules not available; endpoints depending on them will raise an error if used.
    generate_candidates = None
    generate_idea = None
    run_pipeline = None
    GenerationRequest = None
    GenerationResult = None

import asyncio

from fastapi.responses import StreamingResponse

# --- Server-Sent Events helpers ------------------------------------------------

def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


async def _pipeline_wrapper(coro_factory, queue: asyncio.Queue) -> None:
    """Run a pipeline coroutine in the background, forwarding its events to `queue`.

    A `None` sentinel in the queue signals the stream is finished.
    """
    try:
        await coro_factory(queue)
    except Exception as exc:
        try:
            await queue.put({"type": "error", "message": str(exc)})
        except Exception:
            pass
        return
    finally:
        await queue.put(None)


async def _run_pipeline_stream(coro_factory, queue: asyncio.Queue):
    """Async generator that emits SSE frames for a background pipeline.

    Cancels the pipeline task if the client disconnects.
    """
    task = asyncio.create_task(_pipeline_wrapper(coro_factory, queue))
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield _sse_event(item.get("type", "message"), item)
    finally:
        task.cancel()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_pool()


# Database Setup
async def init_db():
    conn = await get_conn()
    c = conn.cursor()
    # Users table (with email)
    await c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
        )
    """)
    await c.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'local'
    """)
    # Projects table
    await c.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            project_data TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    # Project collaborators table
    await c.execute("""
        CREATE TABLE IF NOT EXISTS project_collaborators (
            project_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            PRIMARY KEY (project_id, user_id),
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    # Invitations table
    await c.execute("""
        CREATE TABLE IF NOT EXISTS invitations (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            invitee_email TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (sender_id) REFERENCES users (id)
        )
    """)
    # Chats table
    await c.execute("""
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    """)
    await conn.commit()
    await put_conn(conn)


app = FastAPI(title="Crucible Backend with Supabase Postgres Persistence", lifespan=lifespan)

# Enable CORS for React frontend running on dev port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class RegisterRequest(BaseModel):
    username: str
    password: str
    email: EmailStr

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v

class GoogleLoginRequest(BaseModel):
    credential: str

class GoogleRegisterRequest(BaseModel):
    credential: str
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class GenReqWithProject(BaseModel):
    project_name: str
    topic: str
    theme: Optional[str] = None
    team_size: Optional[int] = None
    time_hours: Optional[int] = None
    goals: Optional[str] = None
    constraints: Optional[str] = None
    urls: Optional[List[str]] = None


class RefReqWithProject(BaseModel):
    project_name: str
    idea: str
    theme: Optional[str] = None
    team_size: Optional[int] = None
    time_hours: Optional[int] = None
    project_id: Optional[str] = None


# Helpers
async def get_user_id_from_header(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    token = authorization.replace("Bearer ", "").strip()
    user_id = token
    if token.startswith("mock-token-"):
        user_id = token.replace("mock-token-", "")

    # Validate user exists
    conn = await get_conn()
    c = conn.cursor()
    await c.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    row = await c.fetchone()
    await put_conn(conn)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid token or session expired")
    return user_id


# Auth Endpoints
@app.get("/api/check-availability")
async def check_availability(username: Optional[str] = None, email: Optional[str] = None):
    conn = await get_conn()
    c = conn.cursor()
    
    result = {"username_available": True, "email_available": True}
    
    if username:
        await c.execute("SELECT id FROM users WHERE username = %s", (username,))
        if await c.fetchone():
            result["username_available"] = False
            
    if email:
        await c.execute("SELECT id FROM users WHERE email = %s", (email,))
        if await c.fetchone():
            result["email_available"] = False
            
    await put_conn(conn)
    return result

@app.post("/api/register")
async def register(req: RegisterRequest):
    conn = await get_conn()
    c = conn.cursor()
    try:
        user_id = str(uuid.uuid4())
        await c.execute(
            "INSERT INTO users (id, username, password, email, provider) VALUES (%s, %s, %s, %s, 'local')",
            (user_id, req.username, req.password, req.email),
        )
        await conn.commit()
        return {"id": user_id, "username": req.username, "email": req.email}
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    finally:
        await put_conn(conn)


@app.post("/api/login")
async def login(req: LoginRequest):
    conn = await get_conn()
    c = conn.cursor()
    await c.execute(
        "SELECT id, email, provider FROM users WHERE username = %s AND password = %s",
        (req.username, req.password),
    )
    row = await c.fetchone()
    await put_conn(conn)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or passcode"
        )
    user_id = row[0]
    email = row[1]
    provider = row[2]
    return {
        "token": f"mock-token-{user_id}",
        "user_id": user_id,
        "username": req.username,
        "email": email,
        "provider": provider,
    }

@app.post("/api/google-login")
async def google_login(req: GoogleLoginRequest):
    try:
        idinfo = id_token.verify_oauth2_token(
            req.credential, google_requests.Request(), os.getenv("GOOGLE_CLIENT_ID")
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    email = idinfo["email"]
    
    conn = await get_conn()
    c = conn.cursor()
    await c.execute("SELECT id, username, provider FROM users WHERE email = %s", (email,))
    row = await c.fetchone()
    await put_conn(conn)
    
    if row:
        user_id = row[0]
        username = row[1]
        provider = row[2]
        return {
            "token": f"mock-token-{user_id}",
            "user_id": user_id,
            "username": username,
            "email": email,
            "provider": provider,
        }
    else:
        return {"requires_username": True, "email": email}

@app.post("/api/google-register")
async def google_register(req: GoogleRegisterRequest):
    try:
        idinfo = id_token.verify_oauth2_token(
            req.credential, google_requests.Request(), os.getenv("GOOGLE_CLIENT_ID")
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    email = idinfo["email"]
    
    conn = await get_conn()
    c = conn.cursor()
    
    try:
        user_id = str(uuid.uuid4())
        password = str(uuid.uuid4())  # generate random password
        await c.execute(
            "INSERT INTO users (id, username, password, email, provider) VALUES (%s, %s, %s, %s, 'google')",
            (user_id, req.username, password, email),
        )
        await conn.commit()
        return {
            "token": f"mock-token-{user_id}",
            "user_id": user_id,
            "username": req.username,
            "email": email,
            "provider": "google",
        }
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    finally:
        await put_conn(conn)


@app.put("/api/user/password")
async def update_password(req: UpdatePasswordRequest, authorization: str = Header(None)):
    user_id = await get_user_id_from_header(authorization)
    conn = await get_conn()
    c = conn.cursor()
    
    try:
        await c.execute("SELECT id FROM users WHERE id = %s AND password = %s", (user_id, req.current_password))
        if not await c.fetchone():
             raise HTTPException(status_code=400, detail="Incorrect current password")
             
        await c.execute("UPDATE users SET password = %s WHERE id = %s", (req.new_password, user_id))
        await conn.commit()
        return {"status": "success"}
    finally:
        await put_conn(conn)


class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

@app.put("/api/user")
async def update_user(req: UpdateUserRequest, authorization: str = Header(None)):
    """Update the authenticated user's username and/or email.
    Returns the updated username and email."""
    user_id = await get_user_id_from_header(authorization)
    conn = await get_conn()
    c = conn.cursor()
    if req.username:
        await c.execute("SELECT id FROM users WHERE username = %s AND id != %s", (req.username, user_id))
        if await c.fetchone():
            await put_conn(conn)
            raise HTTPException(status_code=400, detail="Username already taken")
    if req.email:
        await c.execute("SELECT id FROM users WHERE email = %s AND id != %s", (req.email, user_id))
        if await c.fetchone():
            await put_conn(conn)
            raise HTTPException(status_code=400, detail="Email already registered")
    updates = []
    params = []
    if req.username:
        updates.append("username = %s")
        params.append(req.username)
    if req.email:
        updates.append("email = %s")
        params.append(req.email)
    params.append(user_id)
    if updates:
        await c.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", tuple(params))
        await conn.commit()
    await c.execute("SELECT username, email FROM users WHERE id = %s", (user_id,))
    row = await c.fetchone()
    await put_conn(conn)
    return {"username": row[0], "email": row[1]}

# Project Endpoints
def _project_ideas(project_data_raw: Optional[str]) -> list[dict]:
    """Extract a browsable idea list (candidates + refinement versions) from a project."""
    try:
        project_data = json.loads(project_data_raw) if project_data_raw else {}
    except (json.JSONDecodeError, TypeError):
        project_data = {}
    ideas: list[dict] = []

    candidates = project_data.get("candidates")
    if isinstance(candidates, list):
        for idx, cand in enumerate(candidates):
            if isinstance(cand, dict):
                title = cand.get("title") or f"Idea #{idx + 1}"
                ideas.append({"type": "candidate", "idx": idx, "label": f"Idea #{idx + 1}: {title}", "title": title})

    versions = project_data.get("versions")
    if isinstance(versions, list):
        for v in versions:
            if isinstance(v, dict):
                vn = v.get("version") or 1
                title = ""
                mod = v.get("moderator")
                if isinstance(mod, dict):
                    title = mod.get("refined_idea") or mod.get("title") or ""
                ideas.append({"type": "version", "idx": (vn - 1) if vn >= 1 else 0, "label": f"Version {vn}", "title": title})

    return ideas


@app.get("/api/projects")
async def get_projects(user_id: str = Header(None, alias="Authorization")):
    resolved_user_id = await get_user_id_from_header(user_id)
    conn = await get_conn()
    c = conn.cursor()
    # Return solo projects owned by the user (projects with 0 collaborators)
    await c.execute("""
        SELECT id, name, created_at, project_data FROM projects 
        WHERE user_id = %s 
          AND (SELECT COUNT(*) FROM project_collaborators WHERE project_id = projects.id) = 0
        ORDER BY created_at DESC
    """, (resolved_user_id,))
    rows = await c.fetchall()
    await put_conn(conn)
    return [
        {
            "id": row[0],
            "name": row[1],
            "created_at": row[2],
            "ideas": _project_ideas(row[3]),
        }
        for row in rows
    ]


@app.get("/api/projects/collaborations")
async def get_collaborated_projects(authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    conn = await get_conn()
    c = conn.cursor()
    # Return projects where the user is a collaborator OR projects owned by the user that have 1 or more collaborators
    await c.execute("""
        SELECT DISTINCT p.id, p.name, p.created_at 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE pc.user_id = %s
           OR (p.user_id = %s AND (SELECT COUNT(*) FROM project_collaborators pc2 WHERE pc2.project_id = p.id) > 0)
        ORDER BY p.created_at DESC
    """, (resolved_user_id, resolved_user_id))
    rows = await c.fetchall()
    await put_conn(conn)
    return [
        {"id": row[0], "name": row[1], "created_at": row[2]} for row in rows
    ]


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, user_id: str = Header(None, alias="Authorization")):
    resolved_user_id = await get_user_id_from_header(user_id)
    conn = await get_conn()
    c = conn.cursor()
    await c.execute("""
        SELECT p.id, p.name, p.created_at, p.project_data, p.user_id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = %s AND (p.user_id = %s OR pc.user_id = %s)
    """, (project_id, resolved_user_id, resolved_user_id))
    row = await c.fetchone()
    await put_conn(conn)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found or access denied")

    project_data = json.loads(row[3]) if row[3] else {}
    return {
        "id": row[0],
        "name": row[1],
        "created_at": row[2],
        "project_data": project_data,
        "owner_id": row[4],
    }


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, user_id: str = Header(None, alias="Authorization")):
    resolved_user_id = await get_user_id_from_header(user_id)
    conn = await get_conn()
    c = conn.cursor()
    # Verify owner or collaborator
    await c.execute("""
        SELECT p.id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = %s AND (p.user_id = %s OR pc.user_id = %s)
    """, (project_id, resolved_user_id, resolved_user_id))
    if not await c.fetchone():
        await put_conn(conn)
        raise HTTPException(status_code=403, detail="Access denied or project not found")

    # Delete related chats
    await c.execute("DELETE FROM chats WHERE project_id = %s", (project_id,))
    # Delete collaborators
    await c.execute("DELETE FROM project_collaborators WHERE project_id = %s", (project_id,))
    # Delete the project itself
    await c.execute("DELETE FROM projects WHERE id = %s", (project_id,))
    await conn.commit()
    await put_conn(conn)
    return {"detail": "Project deleted successfully"}


@app.get("/api/projects/{project_id}/chats")
async def get_project_chats(project_id: str, user_id: str = Header(None, alias="Authorization")):
    resolved_user_id = await get_user_id_from_header(user_id)
    conn = await get_conn()
    c = conn.cursor()
    # Verify owner OR collaborator
    await c.execute("""
        SELECT p.id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = %s AND (p.user_id = %s OR pc.user_id = %s)
    """, (project_id, resolved_user_id, resolved_user_id))
    if not await c.fetchone():
        await put_conn(conn)
        raise HTTPException(status_code=403, detail="Access denied or project not found")

    await c.execute(
        "SELECT sender, message, created_at FROM chats WHERE project_id = %s ORDER BY created_at ASC",
        (project_id,),
    )
    rows = await c.fetchall()
    await put_conn(conn)
    return [
        {"sender": row[0], "message": row[1], "created_at": row[2]}
        for row in rows
    ]


# Debate / Generation Routing
@app.post("/idea/generate")
async def handle_generate(req: GenReqWithProject, request: Request, authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    # Run the core generation pipeline
    gen_req = GenerationRequest(
        topic=req.topic,
        theme=req.theme,
        team_size=req.team_size,
        time_hours=req.time_hours,
        goals=req.goals,
        constraints=req.constraints,
        urls=req.urls,
    )

    async def _generate(q: asyncio.Queue):
        async def emit(item):
            await q.put(item)

        result = await generate_candidates(request.app, gen_req, emit=emit)

        project_id = str(uuid.uuid4())
        created_at = datetime.datetime.utcnow().isoformat()

        project_data = {
            "status": "pending_selection",
            "candidates": result.get("candidates", []),
            "research": result.get("research", None),
            "proposals": result.get("proposals", {}),
            "debates": result.get("debates", {}),
            "context": result.get("context", "")
        }
        project_data_json = json.dumps(project_data, default=str)

        conn = await get_conn()
        c = conn.cursor()
        await c.execute(
            "INSERT INTO projects (id, user_id, name, created_at, project_data) VALUES (%s, %s, %s, %s, %s)",
            (project_id, resolved_user_id, req.project_name, created_at, project_data_json),
        )

        for agent, round_data in result.get("debates", {}).items():
            if round_data and "root" in round_data:
                for reply in round_data["root"]:
                    msg_id = str(uuid.uuid4())
                    stance_val = reply.get("stance", "neutral")
                    if isinstance(stance_val, dict) and "value" in stance_val:
                        stance_val = stance_val["value"]
                    elif hasattr(stance_val, "value"):
                        stance_val = stance_val.value
                    message_text = f"Debated {reply.get('reply_to', '')} ({stance_val}): {reply.get('argument', '')}"
                    await c.execute(
                        "INSERT INTO chats (id, project_id, sender, message, created_at) VALUES (%s, %s, %s, %s, %s)",
                        (msg_id, project_id, agent, message_text, created_at),
                    )
        await conn.commit()
        await put_conn(conn)

        await emit({
            "type": "complete",
            "project_id": project_id,
            "project_name": req.project_name,
            "status": "pending_selection",
            "candidates": result.get("candidates", []),
        })

    return StreamingResponse(
        _run_pipeline_stream(_generate, asyncio.Queue()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class SelectCandidateRequest(BaseModel):
    title: str
    idea: str


@app.post("/api/projects/{project_id}/select-candidate")
async def select_candidate(project_id: str, req: SelectCandidateRequest, request: Request, authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    conn = await get_conn()
    c = conn.cursor()
    
    # Verify owner OR collaborator
    await c.execute("""
        SELECT p.project_data, p.name 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = %s AND (p.user_id = %s OR pc.user_id = %s)
    """, (project_id, resolved_user_id, resolved_user_id))
    row = await c.fetchone()
    if not row:
        await put_conn(conn)
        raise HTTPException(status_code=404, detail="Project not found or access denied")
        
    project_data = json.loads(row[0]) if row[0] else {}
    project_name = row[1]
    await put_conn(conn)

    context = project_data.get("context", "")

    async def _select(q: asyncio.Queue):
        async def emit(item):
            await q.put(item)

        result = await run_pipeline(request.app, req.idea, idea_context=context, emit=emit)

        res_dict = {
            "reviews": {k: v.model_dump() for k, v in result.reviews.items()},
            "debate": {k: v.model_dump() for k, v in result.debate.items()},
            "reflections": {k: v.model_dump() for k, v in result.reflections.items()},
            "moderator": result.moderator.model_dump() if result.moderator else None,
            "research": {k: v.model_dump() for k, v in result.research.items()},
        }

        conn = await get_conn()
        c = conn.cursor()
        project_data["status"] = "active"
        project_data["selected_candidate"] = {"title": req.title, "idea": req.idea}
        project_data["refinement"] = res_dict
        project_data_json = json.dumps(project_data, default=str)
        await c.execute(
            "UPDATE projects SET project_data = %s WHERE id = %s",
            (project_data_json, project_id)
        )

        created_at = datetime.datetime.utcnow().isoformat()
        for agent, round_data in result.debate.items():
            if round_data and round_data.root:
                for reply in round_data.root:
                    msg_id = str(uuid.uuid4())
                    message_text = f"Debated {reply.reply_to} ({reply.stance.value}): {reply.argument}"
                    await c.execute(
                        "INSERT INTO chats (id, project_id, sender, message, created_at) VALUES (%s, %s, %s, %s, %s)",
                        (msg_id, project_id, agent, message_text, created_at),
                    )
        await conn.commit()
        await put_conn(conn)

        await emit({"type": "complete", "project_id": project_id, "project_name": project_name})

    return StreamingResponse(
        _run_pipeline_stream(_select, asyncio.Queue()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/idea/refine")
async def handle_refine(req: RefReqWithProject, request: Request, authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    context_parts = []
    if req.theme:
        context_parts.append(f"Theme: {req.theme}")
    if req.team_size:
        context_parts.append(f"Team size: {req.team_size}")
    if req.time_hours:
        context_parts.append(f"Time available: {req.time_hours} hours")
    idea_context = "\n".join(context_parts) if context_parts else None

    async def _refine(q: asyncio.Queue):
        async def emit(item):
            await q.put(item)

        result = await run_pipeline(request.app, req.idea, idea_context=idea_context, emit=emit)
        created_at = datetime.datetime.utcnow().isoformat()

        res_dict = {
            "idea": req.idea,
            "reviews": {k: v.model_dump() for k, v in result.reviews.items()},
            "debate": {k: v.model_dump() for k, v in result.debate.items()},
            "reflections": {k: v.model_dump() for k, v in result.reflections.items()},
            "moderator": result.moderator.model_dump() if result.moderator else None,
            "research": {k: v.model_dump() for k, v in result.research.items()},
        }

        project_id = req.project_id or str(uuid.uuid4())
        project_data = {}

        conn = await get_conn()
        c = conn.cursor()

        # When iterating an existing idea (project_id provided), append a new
        # version to the SAME project instead of creating a brand-new one.
        if req.project_id:
            await c.execute(
                "SELECT project_data, name FROM projects WHERE id = %s AND user_id = %s",
                (req.project_id, resolved_user_id),
            )
            row = await c.fetchone()
            if not row:
                await put_conn(conn)
                raise HTTPException(status_code=404, detail="Project not found or access denied")
            project_data = json.loads(row[0]) if row[0] else {}
            if not req.project_name:
                req.project_name = row[1]

        versions = project_data.get("versions")
        if not isinstance(versions, list):
            # Seed any legacy refinement as version 1 so iterations stack cleanly.
            versions = []
            legacy = project_data.get("refinement")
            if isinstance(legacy, dict):
                versions.append({
                    "version": 1,
                    "created_at": project_data.get("created_at", created_at),
                    "idea": legacy.get("idea", ""),
                    "reviews": legacy.get("reviews", {}),
                    "debate": legacy.get("debate", {}),
                    "reflections": legacy.get("reflections", {}),
                    "moderator": legacy.get("moderator", None),
                    "research": legacy.get("research", {}),
                })

        next_version = (versions[-1]["version"] + 1) if versions else 1

        version_obj = {
            "version": next_version,
            "created_at": created_at,
            "idea": req.idea,
            "reviews": res_dict["reviews"],
            "debate": res_dict["debate"],
            "reflections": res_dict["reflections"],
            "moderator": res_dict["moderator"],
            "research": res_dict["research"],
        }
        versions.append(version_obj)

        # Keep latest version mirrored under `refinement` for backward compat.
        project_data["versions"] = versions
        project_data["refinement"] = res_dict
        project_data["created_at"] = created_at

        project_data_json = json.dumps(project_data, default=str)

        if req.project_id:
            await c.execute(
                "UPDATE projects SET project_data = %s, name = %s WHERE id = %s",
                (project_data_json, req.project_name, project_id),
            )
        else:
            await c.execute(
                "INSERT INTO projects (id, user_id, name, created_at, project_data) VALUES (%s, %s, %s, %s, %s)",
                (project_id, resolved_user_id, req.project_name, created_at, project_data_json),
            )

        for agent, round_data in result.debate.items():
            if round_data and round_data.root:
                for reply in round_data.root:
                    msg_id = str(uuid.uuid4())
                    message_text = f"Debated {reply.reply_to} ({reply.stance.value}): {reply.argument}"
                    await c.execute(
                        "INSERT INTO chats (id, project_id, sender, message, created_at) VALUES (%s, %s, %s, %s, %s)",
                        (msg_id, project_id, agent, message_text, created_at),
                    )

        await conn.commit()
        await put_conn(conn)

        await emit({
            "type": "complete",
            "project_id": project_id,
            "project_name": req.project_name,
            "version": next_version,
            "versions": [v["version"] for v in versions],
        })

    return StreamingResponse(
        _run_pipeline_stream(_refine, asyncio.Queue()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


from llm import LLM


class ChatAgentRequest(BaseModel):
    message: str
    recipient: str


def get_agent_response_prompt(
    agent_name: str,
    idea: str,
    project_data: dict,
    chat_history: list[dict],
    user_message: str
) -> str:
    personas = {
        "skeptic": "Devil's advocate. Probes the idea for hidden complexity, failure modes, and unproven assumptions. Focuses on concrete mitigations, fallback plans, or scope cuts.",
        "innovation": "Innovation specialist. Focuses on novelty, creativity, and unique selling proposition. Evaluates what makes the idea original and fresh.",
        "feasibility": "Feasibility assessor. Focuses on implementation realism, timeline, engineering effort, complexity, and resource limits during the hackathon.",
        "impact": "Impact assessor. Focuses on user adoption, business value, wow-factor, real-world utility, and presentation value.",
        "technical": "Technical architect. Focuses on system design, database schemas, APIs, performance, security, and integration challenges.",
        "moderator": "Moderator consensus organizer. Synthesizes the comments of the entire panel, highlighting agreements and remaining issues."
    }
    
    persona = personas.get(agent_name.lower(), "Collaborative AI Agent.")
    
    # Get refinement context (reviews / debate / reflections)
    # project_data might contain a "refinement" key (if generated/selected), or it is at the root (if directly refined).
    ref_data = project_data.get("refinement", project_data) if "refinement" in project_data else project_data
    
    debate_context = ""
    if ref_data:
        mod_summary = ""
        moderator = ref_data.get("moderator", {})
        if moderator:
            if isinstance(moderator, dict):
                mod_summary = moderator.get("synthesized_consensus", "")
        if mod_summary:
            debate_context += f"\nModerator Consensus:\n{mod_summary}\n"
        
        reviews = ref_data.get("reviews", {})
        if agent_name.lower() in [k.lower() for k in reviews.keys()]:
            # find key case-insensitively
            key = next((k for k in reviews.keys() if k.lower() == agent_name.lower()), agent_name)
            review = reviews[key]
            if isinstance(review, dict):
                score = review.get("score", "N/A")
                cons = review.get("cons", [])
                pros = review.get("pros", [])
                debate_context += f"\nYour original review score: {score}\nPros: {', '.join(pros)}\nCons: {', '.join(cons)}\n"

    # Limit history to last 10 messages for prompt length limits
    history_str = ""
    for msg in chat_history[-10:]:
        sender = msg.get("sender", "User")
        text = msg.get("message", "")
        history_str += f"{sender}: {text}\n"
        
    prompt = f"""You are the {agent_name.upper()} agent in the Crucible hackathon debate panel.
Your role/persona instructions: {persona}

The project idea under review is:
"{idea}"

Here is the initial debate context:
{debate_context}

Here is the recent conversation history with the user (operator):
{history_str}

The user has asked you:
"{user_message}"

Provide a concise, direct response answering their question in character. Ground your arguments in the hackathon context, stay helpful but aligned with your specific focus areas, and output ONLY your reply (no headers, no labels).
Response:"""
    return prompt


@app.post("/api/projects/{project_id}/chat")
async def chat_with_agent(project_id: str, req: ChatAgentRequest, authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    conn = await get_conn()
    c = conn.cursor()
    
    # 1. Verify access (owner OR collaborator)
    await c.execute("""
        SELECT p.project_data, u.username 
        FROM projects p
        JOIN users u ON u.id = %s
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = %s AND (p.user_id = %s OR pc.user_id = %s)
    """, (resolved_user_id, project_id, resolved_user_id, resolved_user_id))
    row = await c.fetchone()
    if not row:
        await put_conn(conn)
        raise HTTPException(status_code=404, detail="Project not found or access denied")
        
    project_data = json.loads(row[0]) if row[0] else {}
    username = row[1]
    
    # 2. Extract idea
    idea = ""
    if "selected_candidate" in project_data:
        idea = project_data["selected_candidate"].get("idea", "")
    else:
        idea = project_data.get("idea", "")
        
    # 3. Load chat history
    await c.execute("""
        SELECT sender, message 
        FROM chats 
        WHERE project_id = %s 
        ORDER BY created_at ASC
    """, (project_id,))
    chat_rows = await c.fetchall()
    chat_history = [{"sender": r[0], "message": r[1]} for r in chat_rows]
    
    # 4. Insert user message in database
    created_at = datetime.datetime.utcnow().isoformat()
    user_msg_id = str(uuid.uuid4())
    await c.execute("""
        INSERT INTO chats (id, project_id, sender, message, created_at)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_msg_id, project_id, username, req.message, created_at))
    await conn.commit()
    await put_conn(conn)

    # 5. Format agent prompt and stream the reply token-by-token
    prompt = get_agent_response_prompt(req.recipient, idea, project_data, chat_history, req.message)
    agent_display_name = f"{req.recipient.capitalize()} Agent"

    async def event_source():
        yield _sse_event("user_message", {
            "sender": username,
            "message": req.message,
            "created_at": created_at,
        })
        llm = LLM()
        chunks: list[str] = []
        try:
            async for chunk in llm.stream(prompt):
                chunks.append(chunk)
                yield _sse_event("token", {"text": chunk})
        except Exception as e:
            yield _sse_event("error", {"message": f"LLM generation failed: {str(e)}"})
            return

        # 6. Persist agent response once streaming completes
        agent_reply = "".join(chunks)
        conn = await get_conn()
        c = conn.cursor()
        agent_msg_id = str(uuid.uuid4())
        await c.execute("""
            INSERT INTO chats (id, project_id, sender, message, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (agent_msg_id, project_id, agent_display_name, agent_reply, created_at))
        await conn.commit()
        await put_conn(conn)

        yield _sse_event("agent_done", {
            "sender": agent_display_name,
            "message": agent_reply,
            "created_at": created_at,
        })

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )





def send_invitation_email(
    invitee_email: str,
    invitee_username: str,
    sender_username: str,
    sender_email: str,
    project_name: str,
    invite_id: str
):
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
        
    smtp_username = os.environ.get("SMTP_USERNAME")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    smtp_from = os.environ.get("SMTP_FROM", "no-reply@crucible.ai")
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    
    accept_link = f"{frontend_url}?accept_invite={invite_id}"
    
    subject = f"Crucible: Invitation to collaborate on project '{project_name}'"
    body = f"""Hello {invitee_username},

You have been invited by {sender_username} ({sender_email}) to collaborate on the project '{project_name}' in Crucible.

To accept this invitation and join the collaboration, please click the link below:
{accept_link}

If you do not have an account, please register using this email address: {invitee_email} and then click the link.

Best regards,
Crucible Team
"""
    # Log to sent_emails.log
    log_dir = ROOT_DIR / "outputs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "sent_emails.log"
    try:
        with open(log_file, "a") as f:
            f.write(f"--- EMAIL SENT AT {datetime.datetime.utcnow().isoformat()} ---\n")
            f.write(f"To: {invitee_email}\n")
            f.write(f"Subject: {subject}\n")
            f.write(f"Body:\n{body}\n")
            f.write("-" * 40 + "\n")
    except Exception as log_err:
        print(f"Failed to log email: {log_err}")

    if not smtp_username or not smtp_password:
        print(f"[MOCK EMAIL] SMTP credentials not set. Logged link to: {log_file}")
        print(f"[MOCK EMAIL] Link: {accept_link}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = f"{sender_username} via Crucible <{smtp_from}>"
        msg['Reply-To'] = sender_email
        msg['To'] = invitee_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_from, invitee_email, msg.as_string())
        server.quit()
        print(f"Successfully sent invitation email to {invitee_email}")
    except Exception as e:
        print(f"Error sending email: {str(e)}")


class InviteUserRequest(BaseModel):
    email: str


@app.post("/api/projects/{project_id}/invite")
async def invite_collaborator(
    project_id: str, 
    req: InviteUserRequest, 
    background_tasks: BackgroundTasks,
    authorization: str = Header(None)
):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    conn = await get_conn()
    c = conn.cursor()
    
    # 1. Verify that the logged-in user is either the owner or a collaborator
    await c.execute("""
        SELECT p.id, p.name 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = %s AND (p.user_id = %s OR pc.user_id = %s)
    """, (project_id, resolved_user_id, resolved_user_id))
    project_row = await c.fetchone()
    if not project_row:
        await put_conn(conn)
        raise HTTPException(status_code=403, detail="Access denied or project not found")
        
    project_name = project_row[1]

    # Get sender username and email
    await c.execute("SELECT username, email FROM users WHERE id = %s", (resolved_user_id,))
    sender_row = await c.fetchone()
    sender_username = sender_row[0] if sender_row else "An Operator"
    sender_email = sender_row[1] if sender_row else ""

    # 2. Find target user by email
    await c.execute("SELECT id, username FROM users WHERE email = %s", (req.email,))
    invitee_row = await c.fetchone()
    if not invitee_row:
        await put_conn(conn)
        raise HTTPException(status_code=404, detail="Operator with this email not registered yet")
        
    invitee_id = invitee_row[0]
    invitee_username = invitee_row[1]
    
    # 3. Prevent self-invitation
    if invitee_id == resolved_user_id:
        await put_conn(conn)
        raise HTTPException(status_code=400, detail="You cannot invite yourself")
        
    # 4. Check if already a collaborator
    await c.execute("SELECT user_id FROM project_collaborators WHERE project_id = %s AND user_id = %s", (project_id, invitee_id))
    if await c.fetchone():
        await put_conn(conn)
        raise HTTPException(status_code=400, detail="This operator is already a collaborator on this project")
        
    # 5. Check if invitation already pending (allow resending)
    await c.execute("SELECT id FROM invitations WHERE project_id = %s AND invitee_email = %s AND status = 'pending'", (project_id, req.email))
    existing_invite = await c.fetchone()
    if existing_invite:
        invite_id = existing_invite[0]
        created_at = datetime.datetime.utcnow().isoformat()
        await c.execute("UPDATE invitations SET created_at = %s WHERE id = %s", (created_at, invite_id))
        await conn.commit()
        await put_conn(conn)
        
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
        invite_link = f"{frontend_url}?accept_invite={invite_id}"
        
        # Resend email in background
        background_tasks.add_task(
            send_invitation_email,
            req.email,
            invitee_username,
            sender_username,
            sender_email,
            project_name,
            invite_id
        )
        return {"message": f"Invitation resent to {req.email}. Link: {invite_link}"}
        
    # 6. Create invitation
    invite_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    await c.execute("""
        INSERT INTO invitations (id, project_id, sender_id, invitee_email, status, created_at)
        VALUES (%s, %s, %s, %s, 'pending', %s)
    """, (invite_id, project_id, resolved_user_id, req.email, created_at))
    
    await conn.commit()
    await put_conn(conn)
    
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    invite_link = f"{frontend_url}?accept_invite={invite_id}"
    
    # Schedule background email send
    background_tasks.add_task(
        send_invitation_email,
        req.email,
        invitee_username,
        sender_username,
        sender_email,
        project_name,
        invite_id
    )
    
    return {"message": f"Invitation successfully transmitted to {req.email}. Link: {invite_link}"}


@app.get("/api/invitations")
async def get_invitations(authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    conn = await get_conn()
    c = conn.cursor()
    
    # Find user email first
    await c.execute("SELECT email FROM users WHERE id = %s", (resolved_user_id,))
    email_row = await c.fetchone()
    if not email_row:
        await put_conn(conn)
        raise HTTPException(status_code=404, detail="User email not found")
        
    user_email = email_row[0]
    
    # Select pending invitations for this email
    await c.execute("""
        SELECT i.id, i.project_id, p.name, u.username, i.created_at
        FROM invitations i
        JOIN projects p ON i.project_id = p.id
        JOIN users u ON i.sender_id = u.id
        WHERE i.invitee_email = %s AND i.status = 'pending'
        ORDER BY i.created_at DESC
    """, (user_email,))
    rows = await c.fetchall()
    await put_conn(conn)
    
    return [
        {
            "id": row[0],
            "project_id": row[1],
            "project_name": row[2],
            "sender_name": row[3],
            "created_at": row[4]
        }
        for row in rows
    ]


class RespondInvitationRequest(BaseModel):
    response: str # "accept" or "decline"


@app.post("/api/invitations/{invitation_id}/respond")
async def respond_invitation(invitation_id: str, req: RespondInvitationRequest, authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    conn = await get_conn()
    c = conn.cursor()
    
    # Load invitation
    await c.execute("SELECT project_id, invitee_email, status FROM invitations WHERE id = %s", (invitation_id,))
    inv_row = await c.fetchone()
    if not inv_row:
        await put_conn(conn)
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    project_id, invitee_email, status = inv_row
    
    # Verify invitation is pending
    if status != 'pending':
        await put_conn(conn)
        raise HTTPException(status_code=400, detail="Invitation already processed")
        
    # Verify the logged-in user's email matches the invitee_email
    await c.execute("SELECT email FROM users WHERE id = %s", (resolved_user_id,))
    email_row = await c.fetchone()
    if not email_row or email_row[0] != invitee_email:
        await put_conn(conn)
        raise HTTPException(status_code=403, detail="Access denied: invitation email mismatch")
        
    # Process response
    new_status = 'accepted' if req.response == 'accept' else 'declined'
    await c.execute("UPDATE invitations SET status = %s WHERE id = %s", (new_status, invitation_id))
    
    if new_status == 'accepted':
        joined_at = datetime.datetime.utcnow().isoformat()
        await c.execute("""
            INSERT INTO project_collaborators (project_id, user_id, joined_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (project_id, user_id) DO NOTHING
        """, (project_id, resolved_user_id, joined_at))
        
    await conn.commit()
    await put_conn(conn)
    return {"message": f"Invitation {new_status}."}


@app.get("/api/projects/{project_id}/collaborators")
async def get_project_collaborators(project_id: str, authorization: str = Header(None)):
    resolved_user_id = await get_user_id_from_header(authorization)
    
    conn = await get_conn()
    c = conn.cursor()
    
    # Verify owner OR collaborator
    await c.execute("""
        SELECT p.id, p.user_id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = %s AND (p.user_id = %s OR pc.user_id = %s)
    """, (project_id, resolved_user_id, resolved_user_id))
    if not await c.fetchone():
        await put_conn(conn)
        raise HTTPException(status_code=403, detail="Access denied or project not found")
        
    # Get owner info
    await c.execute("""
        SELECT u.username, u.email 
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = %s
    """, (project_id,))
    owner_row = await c.fetchone()
    owner = {"username": owner_row[0], "email": owner_row[1], "role": "owner"} if owner_row else None
    
    # Get collaborators
    await c.execute("""
        SELECT u.username, u.email 
        FROM project_collaborators pc
        JOIN users u ON pc.user_id = u.id
        WHERE pc.project_id = %s
    """, (project_id,))
    rows = await c.fetchall()
    await put_conn(conn)
    
    collaborators = [
        {"username": row[0], "email": row[1], "role": "collaborator"}
        for row in rows
    ]
    
    return {
        "owner": owner,
        "collaborators": collaborators
    }


# Health check
@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
