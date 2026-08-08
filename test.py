import asyncio
from fastapi import FastAPI

from llm import LLM
from orchestrator import run_pipeline

EXAMPLE_IDEA = (
    "We want to build an app for college students that turns their messy "
    "handwritten notes into digital flashcards for exam prep. We're a team of 3 "
    "and we have 24 hours. We want to win the Best AI Award and keep everything "
    "on free-tier tools since we have no budget."
)


async def main() -> None:
    from a2a_router.server import mount

    app = FastAPI()
    mount(app, llm=LLM())

    result = await run_pipeline(app, EXAMPLE_IDEA)
    print(f"\nDone: {len(result.reviews)} reviews, {len(result.debate)} debate rounds, "
          f"{len(result.reflections)} reflections")


if __name__ == "__main__":
    asyncio.run(main())
