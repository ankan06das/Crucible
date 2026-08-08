import asyncio

from llm import LLM


async def main() -> None:
    llm = LLM()
    print(await llm.generate("Reply with exactly: hello world"))


if __name__ == "__main__":
    asyncio.run(main())
