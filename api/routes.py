from fastapi import APIRouter, Request

import generator as gen
from schemas.generation import GenerationRequest, GenerationResult

router = APIRouter()


@router.post("/idea/generate", response_model=GenerationResult)
async def generate_idea(req: GenerationRequest, request: Request) -> GenerationResult:
    return await gen.generate_idea(request.app, req)