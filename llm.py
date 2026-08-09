from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
import json 

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from core.config import LLMSettings, settings

FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1"
logger = logging.getLogger(__name__)
_REQUEST_LIMITER = asyncio.Semaphore(settings.max_concurrent_requests)


@asynccontextmanager
async def _featherless_slot():
    logger.debug("Waiting for Featherless slot")
    await _REQUEST_LIMITER.acquire()
    logger.debug("Acquired Featherless slot")
    try:
        yield
    finally:
        _REQUEST_LIMITER.release()
        logger.debug("Released Featherless slot")


class LLM:
    def __init__(self, settings: LLMSettings = settings):
        self.settings = settings
        self.model = settings.model.removeprefix("nvidia_nim/")
        self.client = AsyncOpenAI(
            api_key=settings.api_key or None,
            base_url=FEATHERLESS_BASE_URL,
            max_retries=settings.max_retries,
        )

    async def generate(self, prompt: str) -> str:
        async with _featherless_slot():
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                reasoning_effort='none'
            )
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("LLM returned no content")
        return content

    async def stream(self, prompt: str):
        """Yield chat completion text deltas as they are generated."""
        async with _featherless_slot():
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                reasoning_effort='none',
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

    async def generate_json(self, prompt: str, response_format:type[BaseModel]) -> type[BaseModel]:
        schema = response_format.model_json_schema()
        system_prompt = f"""
You must return ONLY a valid JSON object.

Your response MUST conform to this JSON schema:

{schema}

Do not use markdown.
Do not use ```json fences.
Do not include explanations or any text outside the JSON object.
"""
        async with _featherless_slot():
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {'role':'system', 'content':system_prompt},
                    {'role':'user', 'content':prompt}
                ],
            )
        try:
            content = response_format.model_validate_json(completion.choices[0].message.content)
            
        except ValidationError as e:
            raise ValueError(f"Invalid JSON | Error: {e}")
            
        return content

            
    # async def generate_json(
    #     self, prompt: str, response_format: type[BaseModel]
    # ) -> BaseModel:
    #     async with _featherless_slot():
    #         completion = await self.client.beta.chat.completions.parse(
    #             model=self.model,
    #             messages=[{"role": "user", "content": prompt}],
    #             response_format=response_format,
    #         )
    #     message = completion.choices[0].message
    #     if message.parsed is not None:
    #         return message.parsed
    #     if message.refusal:
    #         raise ValueError(f"LLM refused structured output: {message.refusal}")
    #     raise ValueError("LLM returned no parsed structured output")
