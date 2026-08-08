from __future__ import annotations

from openai import AsyncOpenAI
from pydantic import BaseModel

from core.config import LLMSettings, settings

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"


class LLM:
    def __init__(self, settings: LLMSettings = settings):
        self.settings = settings
        self.model = settings.model.removeprefix("nvidia_nim/")
        self.client = AsyncOpenAI(
            api_key=settings.api_key or None,
            base_url=NVIDIA_BASE_URL,
            max_retries=settings.max_retries,
        )

    async def generate(self, prompt: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("LLM returned no content")
        return content

    async def generate_json(self, prompt: str, response_format: type[BaseModel]) -> BaseModel:
        completion = await self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format=response_format,
        )
        message = completion.choices[0].message
        if message.parsed is not None:
            return message.parsed
        if message.refusal:
            raise ValueError(f"LLM refused structured output: {message.refusal}")
        raise ValueError("LLM returned no parsed structured output")
