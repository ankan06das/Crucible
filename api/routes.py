import json
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel

import generator as gen
from schemas.generation import GenerationRequest, GenerationResult
from orchestrator import run_pipeline

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class RefineRequest(BaseModel):
    idea: str
    theme: str | None = None
    team_size: int | None = None
    time_hours: int | None = None


@router.post("/api/login")
async def login(req: LoginRequest):
    if req.username == "admin" and req.password == "crucible":
        return {"token": "mock-session-token-xyz"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password"
    )


@router.get("/api/history")
async def get_history():
    runs = []
    output_dir = Path("outputs")
    if not output_dir.exists():
        return []
    for f in output_dir.glob("*.json"):
        if f.name.startswith("generate_") or f.name.startswith("refine_"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                run_id = data.get("run_id", f.stem)
                kind = data.get("kind", "")
                created_at = data.get("created_at", "")
                
                label = ""
                result = data.get("result", {})
                if kind == "generate":
                    conclusion = result.get("conclusion", {})
                    label = conclusion.get("selected_idea", "")
                    if not label:
                        label = "Idea Generation"
                elif kind == "refine":
                    moderator = result.get("moderator", {})
                    label = moderator.get("refined_idea", "")
                    if not label:
                        label = "Idea Refinement"
                
                runs.append({
                    "run_id": run_id,
                    "kind": kind,
                    "created_at": created_at,
                    "label": label,
                    "filename": f.name
                })
            except Exception as e:
                print(f"Error parsing history file {f}: {e}")
    runs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return runs


@router.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    output_dir = Path("outputs")
    for f in output_dir.glob(f"*_{run_id}.json"):
        try:
            return json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            raise HTTPException(status_code=500, detail="Error reading run file")
    raise HTTPException(status_code=404, detail="Run not found")


@router.post("/idea/generate", response_model=GenerationResult)
async def generate_idea(req: GenerationRequest, request: Request) -> GenerationResult:
    return await gen.generate_idea(request.app, req)


@router.post("/idea/refine")
async def refine_idea(req: RefineRequest, request: Request):
    context_parts = []
    if req.theme:
        context_parts.append(f"Theme: {req.theme}")
    if req.team_size:
        context_parts.append(f"Team size: {req.team_size}")
    if req.time_hours:
        context_parts.append(f"Time available: {req.time_hours} hours")
    idea_context = "\n".join(context_parts) if context_parts else None
    
    result = await run_pipeline(request.app, req.idea, idea_context=idea_context)
    return result