import asyncio

from pydantic import BaseModel, Field

from llm import LLM


class TestModel(BaseModel):
    country: str = Field(description="Country in Question")
    capital: str = Field(description="Capital of Country in Question")
    
async def main() -> None:
    llm = LLM()
    print(TestModel.model_json_schema())
    print("Response 1:\n"+ "="*60)
    print(await llm.generate("Reply with exactly: hello world"))
    print("Response 2:\n"+ "="*60)
    print(await llm.generate_json("What is the capital of France?", TestModel))


if __name__ == "__main__":
    asyncio.run(main())
