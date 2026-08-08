import asyncio

from fastapi import FastAPI

from generator import generate_idea
from llm import LLM
from schemas.generation import GenerationRequest

EXAMPLE_REQUEST = GenerationRequest(
    topic="Plant irrigation",
    theme="Agriculture",
    team_size=3,
    time_hours=24,
    goals="Win the Best Award",
    constraints="Free-tier tools only, no budget",
)


async def main() -> None:
    app = FastAPI()

    result = await generate_idea(app, EXAMPLE_REQUEST, llm=LLM())

    print("\n=== RESULT SUMMARY ===")
    print(f"Research facts: {len(result.research.facts)}")
    print(f"Ideator shortlist ideas: {len(result.shortlist.ideas) if result.shortlist else 0}")
    print(f"Pooled candidates: {len(result.candidates)}")
    print(f"Ideator ranking: {result.shortlist.ranking if result.shortlist else None}")
    print(f"Ideator recommended: {result.shortlist.recommended if result.shortlist else None}")
    print(f"Final ranked ideas: {result.conclusion.ranked_ideas}")
    print(f"Selected idea: {result.conclusion.selected_idea}")
    print(f"Refined idea: {result.moderator.refined_idea if result.moderator else None}")

    assert result.shortlist and len(result.shortlist.ideas) >= 2, "ideator shortlist too small"
    assert all(c.title for c in result.candidates), "candidate title missing"


if __name__ == "__main__":
    asyncio.run(main())
