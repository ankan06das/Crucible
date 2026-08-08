import sys
import os
import json
import sqlite3
import uuid
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add root folder to python path so we can import generator and orchestrator
ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from generator import generate_idea
from orchestrator import run_pipeline
from schemas.generation import GenerationRequest, GenerationResult

DB_FILE = Path(__file__).parent / "crucible.db"

app = FastAPI(title="Crucible Backend with SQLite Persistence")

# Enable CORS for React frontend running on dev port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database Setup
def init_db():
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    # Users table
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)
    # Projects table
    c.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            project_data TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    # Chats table
    c.execute("""
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
    """)
    conn.commit()
    conn.close()


init_db()


# Models
class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


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


# Helpers
def get_user_id_from_header(authorization: Optional[str] = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    token = authorization.replace("Bearer ", "").strip()
    user_id = token
    if token.startswith("mock-token-"):
        user_id = token.replace("mock-token-", "")

    # Validate user exists
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid token or session expired")
    return user_id


# Auth Endpoints
@app.post("/api/register")
async def register(req: RegisterRequest):
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    try:
        user_id = str(uuid.uuid4())
        c.execute(
            "INSERT INTO users (id, username, password) VALUES (?, ?, ?)",
            (user_id, req.username, req.password),
        )
        conn.commit()
        return {"id": user_id, "username": req.username}
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    finally:
        conn.close()


@app.post("/api/login")
async def login(req: LoginRequest):
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "SELECT id FROM users WHERE username = ? AND password = ?",
        (req.username, req.password),
    )
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or passcode"
        )
    user_id = row[0]
    return {
        "token": f"mock-token-{user_id}",
        "user_id": user_id,
        "username": req.username,
    }


# Project Endpoints
@app.get("/api/projects")
async def get_projects(user_id: str = Header(None, alias="Authorization")):
    resolved_user_id = get_user_id_from_header(user_id)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "SELECT id, name, created_at FROM projects WHERE user_id = ? ORDER BY created_at DESC",
        (resolved_user_id,),
    )
    rows = c.fetchall()
    conn.close()
    return [
        {"id": row[0], "name": row[1], "created_at": row[2]} for row in rows
    ]


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, user_id: str = Header(None, alias="Authorization")):
    resolved_user_id = get_user_id_from_header(user_id)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "SELECT id, name, created_at, project_data FROM projects WHERE id = ? AND user_id = ?",
        (project_id, resolved_user_id),
    )
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")

    project_data = json.loads(row[3]) if row[3] else {}
    return {
        "id": row[0],
        "name": row[1],
        "created_at": row[2],
        "project_data": project_data,
    }


@app.get("/api/projects/{project_id}/chats")
async def get_project_chats(project_id: str, user_id: str = Header(None, alias="Authorization")):
    get_user_id_from_header(user_id)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "SELECT sender, message, created_at FROM chats WHERE project_id = ? ORDER BY created_at ASC",
        (project_id,),
    )
    rows = c.fetchall()
    conn.close()
    return [
        {"sender": row[0], "message": row[1], "created_at": row[2]}
        for row in rows
    ]


# Debate / Generation Routing
@app.post("/idea/generate")
async def handle_generate(req: GenReqWithProject, request: Request, authorization: str = Header(None)):
    resolved_user_id = get_user_id_from_header(authorization)
    
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
    result = await generate_idea(request.app, gen_req)

    # Save to SQLite Projects
    project_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    project_data_json = json.dumps(result.model_dump(), default=str)

    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "INSERT INTO projects (id, user_id, name, created_at, project_data) VALUES (?, ?, ?, ?, ?)",
        (project_id, resolved_user_id, req.project_name, created_at, project_data_json),
    )

    # Extract debates and save to chats table
    # Standard generation debate
    for agent, round_data in result.debates.items():
        if round_data and round_data.root:
            for reply in round_data.root:
                msg_id = str(uuid.uuid4())
                message_text = f"Debated {reply.reply_to} ({reply.stance.value}): {reply.argument}"
                c.execute(
                    "INSERT INTO chats (id, project_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)",
                    (msg_id, project_id, agent, message_text, created_at),
                )
    
    # Refinement debates
    for agent, round_data in result.refined_debates.items():
        if round_data and round_data.root:
            for reply in round_data.root:
                msg_id = str(uuid.uuid4())
                message_text = f"Debated {reply.reply_to} ({reply.stance.value}): {reply.argument}"
                c.execute(
                    "INSERT INTO chats (id, project_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)",
                    (msg_id, project_id, agent, message_text, created_at),
                )

    conn.commit()
    conn.close()

    return {
        "project_id": project_id,
        "project_name": req.project_name,
        "result": result,
    }


@app.post("/idea/refine")
async def handle_refine(req: RefReqWithProject, request: Request, authorization: str = Header(None)):
    resolved_user_id = get_user_id_from_header(authorization)
    
    context_parts = []
    if req.theme:
        context_parts.append(f"Theme: {req.theme}")
    if req.team_size:
        context_parts.append(f"Team size: {req.team_size}")
    if req.time_hours:
        context_parts.append(f"Time available: {req.time_hours} hours")
    idea_context = "\n".join(context_parts) if context_parts else None

    # Run the core refinement pipeline
    result = await run_pipeline(request.app, req.idea, idea_context=idea_context)

    # Save to SQLite Projects
    project_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    
    # PipelineResult is a Python dataclass; we serialize it to dict
    res_dict = {
        "reviews": {k: v.model_dump() for k, v in result.reviews.items()},
        "debate": {k: v.model_dump() for k, v in result.debate.items()},
        "reflections": {k: v.model_dump() for k, v in result.reflections.items()},
        "moderator": result.moderator.model_dump() if result.moderator else None,
        "research": {k: v.model_dump() for k, v in result.research.items()},
    }
    project_data_json = json.dumps(res_dict, default=str)

    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "INSERT INTO projects (id, user_id, name, created_at, project_data) VALUES (?, ?, ?, ?, ?)",
        (project_id, resolved_user_id, req.project_name, created_at, project_data_json),
    )

    # Extract debates and save to chats table
    for agent, round_data in result.debate.items():
        if round_data and round_data.root:
            for reply in round_data.root:
                msg_id = str(uuid.uuid4())
                message_text = f"Debated {reply.reply_to} ({reply.stance.value}): {reply.argument}"
                c.execute(
                    "INSERT INTO chats (id, project_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)",
                    (msg_id, project_id, agent, message_text, created_at),
                )

    conn.commit()
    conn.close()

    return {
        "project_id": project_id,
        "project_name": req.project_name,
        "result": res_dict,
    }


# Health check
@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
