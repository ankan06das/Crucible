from llm import LLM
from core.config import LLMSettings
import asyncio

from schemas.idea import IdeaResponse

async def main():
    settings = LLMSettings(
        provider="groq",
        model="groq/llama-3.1-8b-instant"
    )
    llm = LLM(settings)
    response = await llm.generate_json("We want to build an app for college students that turns their messy handwritten notes into digital flashcards for exam prep. We're a team of 3 and we have 24 hours. We want to win the Best AI Award and keep everything on free-tier tools since we have no budget.", response_format=IdeaResponse)
    print(response)

if __name__ == "__main__":
    asyncio.run(main())
