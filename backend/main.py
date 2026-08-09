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
    # Users table (with email)
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
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
    # Project collaborators table
    c.execute("""
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
    c.execute("""
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
    email: str


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
            "INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)",
            (user_id, req.username, req.password, req.email),
        )
        conn.commit()
        return {"id": user_id, "username": req.username, "email": req.email}
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    finally:
        conn.close()


@app.post("/api/login")
async def login(req: LoginRequest):
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "SELECT id, email FROM users WHERE username = ? AND password = ?",
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
    email = row[1]
    return {
        "token": f"mock-token-{user_id}",
        "user_id": user_id,
        "username": req.username,
        "email": email,
    }


class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

@app.put("/api/user")
async def update_user(req: UpdateUserRequest, authorization: str = Header(None)):
    """Update the authenticated user's username and/or email.
    Returns the updated username and email."""
    user_id = get_user_id_from_header(authorization)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    if req.username:
        c.execute("SELECT id FROM users WHERE username = ? AND id != ?", (req.username, user_id))
        if c.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Username already taken")
    if req.email:
        c.execute("SELECT id FROM users WHERE email = ? AND id != ?", (req.email, user_id))
        if c.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Email already registered")
    updates = []
    params = []
    if req.username:
        updates.append("username = ?")
        params.append(req.username)
    if req.email:
        updates.append("email = ?")
        params.append(req.email)
    params.append(user_id)
    if updates:
        c.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", tuple(params))
        conn.commit()
    c.execute("SELECT username, email FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return {"username": row[0], "email": row[1]}

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
    c.execute("""
        SELECT p.id, p.name, p.created_at, p.project_data, p.user_id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    """, (project_id, resolved_user_id, resolved_user_id))
    row = c.fetchone()
    conn.close()
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
    resolved_user_id = get_user_id_from_header(user_id)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    # Verify owner or collaborator
    c.execute("""
        SELECT p.id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    """, (project_id, resolved_user_id, resolved_user_id))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied or project not found")

    # Delete related chats
    c.execute("DELETE FROM chats WHERE project_id = ?", (project_id,))
    # Delete collaborators
    c.execute("DELETE FROM project_collaborators WHERE project_id = ?", (project_id,))
    # Delete the project itself
    c.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    return {"detail": "Project deleted successfully"}


@app.get("/api/projects/{project_id}/chats")
async def get_project_chats(project_id: str, user_id: str = Header(None, alias="Authorization")):
    resolved_user_id = get_user_id_from_header(user_id)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    # Verify owner OR collaborator
    c.execute("""
        SELECT p.id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    """, (project_id, resolved_user_id, resolved_user_id))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied or project not found")

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
    result = await generate_candidates(request.app, gen_req)

    # Save to SQLite Projects
    project_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    
    # Save with status pending_selection
    project_data = {
        "status": "pending_selection",
        "candidates": result.get("candidates", []),
        "research": result.get("research", None),
        "proposals": result.get("proposals", {}),
        "debates": result.get("debates", {}),
        "context": result.get("context", "")
    }
    project_data_json = json.dumps(project_data, default=str)

    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute(
        "INSERT INTO projects (id, user_id, name, created_at, project_data) VALUES (?, ?, ?, ?, ?)",
        (project_id, resolved_user_id, req.project_name, created_at, project_data_json),
    )

    # Extract debates and save to chats table (optional, but good for tracking)
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
                c.execute(
                    "INSERT INTO chats (id, project_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)",
                    (msg_id, project_id, agent, message_text, created_at),
                )
    
    conn.commit()
    conn.close()

    return {
        "project_id": project_id,
        "project_name": req.project_name,
        "status": "pending_selection",
        "candidates": result.get("candidates", []),
    }


class SelectCandidateRequest(BaseModel):
    title: str
    idea: str


@app.post("/api/projects/{project_id}/select-candidate")
async def select_candidate(project_id: str, req: SelectCandidateRequest, request: Request, authorization: str = Header(None)):
    resolved_user_id = get_user_id_from_header(authorization)
    
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    
    # Verify owner OR collaborator
    c.execute("""
        SELECT p.project_data, p.name 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    """, (project_id, resolved_user_id, resolved_user_id))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found or access denied")
        
    project_data = json.loads(row[0]) if row[0] else {}
    project_name = row[1]
    
    # Run the refinement pipeline on the selected candidate idea
    context = project_data.get("context", "")
    result = await run_pipeline(request.app, req.idea, idea_context=context)
    
    # Save the refinement reviews and debate
    res_dict = {
        "reviews": {k: v.model_dump() for k, v in result.reviews.items()},
        "debate": {k: v.model_dump() for k, v in result.debate.items()},
        "reflections": {k: v.model_dump() for k, v in result.reflections.items()},
        "moderator": result.moderator.model_dump() if result.moderator else None,
        "research": {k: v.model_dump() for k, v in result.research.items()},
    }
    
    # Update project data status to active
    project_data["status"] = "active"
    project_data["selected_candidate"] = {"title": req.title, "idea": req.idea}
    project_data["refinement"] = res_dict
    
    project_data_json = json.dumps(project_data, default=str)
    
    c.execute(
        "UPDATE projects SET project_data = ? WHERE id = ?",
        (project_data_json, project_id)
    )
    
    # Extract debates and save to chats table
    created_at = datetime.datetime.utcnow().isoformat()
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
        "name": project_name,
        "project_data": project_data
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
        "idea": req.idea,
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
    resolved_user_id = get_user_id_from_header(authorization)
    
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    
    # 1. Verify access (owner OR collaborator)
    c.execute("""
        SELECT p.project_data, u.username 
        FROM projects p
        JOIN users u ON u.id = ?
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    """, (resolved_user_id, project_id, resolved_user_id, resolved_user_id))
    row = c.fetchone()
    if not row:
        conn.close()
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
    c.execute("""
        SELECT sender, message 
        FROM chats 
        WHERE project_id = ? 
        ORDER BY created_at ASC
    """, (project_id,))
    chat_rows = c.fetchall()
    chat_history = [{"sender": r[0], "message": r[1]} for r in chat_rows]
    
    # 4. Insert user message in database
    created_at = datetime.datetime.utcnow().isoformat()
    user_msg_id = str(uuid.uuid4())
    c.execute("""
        INSERT INTO chats (id, project_id, sender, message, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_msg_id, project_id, username, req.message, created_at))
    
    # 5. Format agent prompt and call LLM
    prompt = get_agent_response_prompt(req.recipient, idea, project_data, chat_history, req.message)
    
    llm = LLM()
    try:
        agent_reply = await llm.generate(prompt)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")
        
    # 6. Insert agent response in database
    agent_msg_id = str(uuid.uuid4())
    agent_display_name = f"{req.recipient.capitalize()} Agent"
    c.execute("""
        INSERT INTO chats (id, project_id, sender, message, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (agent_msg_id, project_id, agent_display_name, agent_reply, created_at))
    
    conn.commit()
    conn.close()
    
    return {
        "user_message": {"sender": username, "message": req.message, "created_at": created_at},
        "agent_message": {"sender": agent_display_name, "message": agent_reply, "created_at": created_at}
    }


@app.get("/api/projects/collaborations")
async def get_collaborated_projects(authorization: str = Header(None)):
    resolved_user_id = get_user_id_from_header(authorization)
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    c.execute("""
        SELECT p.id, p.name, p.created_at 
        FROM projects p
        JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE pc.user_id = ?
        ORDER BY p.created_at DESC
    """, (resolved_user_id,))
    rows = c.fetchall()
    conn.close()
    return [
        {"id": row[0], "name": row[1], "created_at": row[2]} for row in rows
    ]


class InviteUserRequest(BaseModel):
    email: str


@app.post("/api/projects/{project_id}/invite")
async def invite_collaborator(project_id: str, req: InviteUserRequest, authorization: str = Header(None)):
    resolved_user_id = get_user_id_from_header(authorization)
    
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    
    # 1. Verify that the logged-in user is either the owner or a collaborator
    c.execute("""
        SELECT p.id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    """, (project_id, resolved_user_id, resolved_user_id))
    project_row = c.fetchone()
    if not project_row:
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied or project not found")
        
    # 2. Find target user by email
    c.execute("SELECT id, username FROM users WHERE email = ?", (req.email,))
    invitee_row = c.fetchone()
    if not invitee_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Operator with this email not registered yet")
        
    invitee_id = invitee_row[0]
    
    # 3. Prevent self-invitation
    if invitee_id == resolved_user_id:
        conn.close()
        raise HTTPException(status_code=400, detail="You cannot invite yourself")
        
    # 4. Check if already a collaborator
    c.execute("SELECT user_id FROM project_collaborators WHERE project_id = ? AND user_id = ?", (project_id, invitee_id))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="This operator is already a collaborator on this project")
        
    # 5. Check if invitation already pending
    c.execute("SELECT id FROM invitations WHERE project_id = ? AND invitee_email = ? AND status = 'pending'", (project_id, req.email))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An invitation is already pending for this operator")
        
    # 6. Create invitation
    invite_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO invitations (id, project_id, sender_id, invitee_email, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
    """, (invite_id, project_id, resolved_user_id, req.email, created_at))
    
    conn.commit()
    conn.close()
    return {"message": f"Invitation successfully transmitted to {req.email}"}


@app.get("/api/invitations")
async def get_invitations(authorization: str = Header(None)):
    resolved_user_id = get_user_id_from_header(authorization)
    
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    
    # Find user email first
    c.execute("SELECT email FROM users WHERE id = ?", (resolved_user_id,))
    email_row = c.fetchone()
    if not email_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User email not found")
        
    user_email = email_row[0]
    
    # Select pending invitations for this email
    c.execute("""
        SELECT i.id, i.project_id, p.name, u.username, i.created_at
        FROM invitations i
        JOIN projects p ON i.project_id = p.id
        JOIN users u ON i.sender_id = u.id
        WHERE i.invitee_email = ? AND i.status = 'pending'
        ORDER BY i.created_at DESC
    """, (user_email,))
    rows = c.fetchall()
    conn.close()
    
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
    resolved_user_id = get_user_id_from_header(authorization)
    
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    
    # Load invitation
    c.execute("SELECT project_id, invitee_email, status FROM invitations WHERE id = ?", (invitation_id,))
    inv_row = c.fetchone()
    if not inv_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Invitation not found")
        
    project_id, invitee_email, status = inv_row
    
    # Verify invitation is pending
    if status != 'pending':
        conn.close()
        raise HTTPException(status_code=400, detail="Invitation already processed")
        
    # Verify the logged-in user's email matches the invitee_email
    c.execute("SELECT email FROM users WHERE id = ?", (resolved_user_id,))
    email_row = c.fetchone()
    if not email_row or email_row[0] != invitee_email:
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied: invitation email mismatch")
        
    # Process response
    new_status = 'accepted' if req.response == 'accept' else 'declined'
    c.execute("UPDATE invitations SET status = ? WHERE id = ?", (new_status, invitation_id))
    
    if new_status == 'accepted':
        joined_at = datetime.datetime.utcnow().isoformat()
        c.execute("""
            INSERT OR IGNORE INTO project_collaborators (project_id, user_id, joined_at)
            VALUES (?, ?, ?)
        """, (project_id, resolved_user_id, joined_at))
        
    conn.commit()
    conn.close()
    return {"message": f"Invitation {new_status}."}


@app.get("/api/projects/{project_id}/collaborators")
async def get_project_collaborators(project_id: str, authorization: str = Header(None)):
    resolved_user_id = get_user_id_from_header(authorization)
    
    conn = sqlite3.connect(str(DB_FILE))
    c = conn.cursor()
    
    # Verify owner OR collaborator
    c.execute("""
        SELECT p.id, p.user_id 
        FROM projects p
        LEFT JOIN project_collaborators pc ON p.id = pc.project_id
        WHERE p.id = ? AND (p.user_id = ? OR pc.user_id = ?)
    """, (project_id, resolved_user_id, resolved_user_id))
    if not c.fetchone():
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied or project not found")
        
    # Get owner info
    c.execute("""
        SELECT u.username, u.email 
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
    """, (project_id,))
    owner_row = c.fetchone()
    owner = {"username": owner_row[0], "email": owner_row[1], "role": "owner"} if owner_row else None
    
    # Get collaborators
    c.execute("""
        SELECT u.username, u.email 
        FROM project_collaborators pc
        JOIN users u ON pc.user_id = u.id
        WHERE pc.project_id = ?
    """, (project_id,))
    rows = c.fetchall()
    conn.close()
    
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
