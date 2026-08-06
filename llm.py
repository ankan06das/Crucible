from litellm import acompletion
from core.config import LLMSettings, settings
from pydantic import BaseModel, ValidationError

class LLM:
    def __init__(self, settings: LLMSettings = settings):
        self.provider = settings.provider
        self.model = settings.model
        self.api_key = settings.api_key or None
        self.settings = settings
    
    
    async def generate(self, prompt: str) -> str:
        kwargs = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
        }
        if self.api_key:
            kwargs["api_key"] = self.api_key
        response = await acompletion(**kwargs)
        return response.choices[0].message.content
    
    async def generate_json(self, prompt: str, response_format: BaseModel) -> BaseModel:
        max_retries = self.settings.max_retries
        last_exception = None
        kwargs = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": response_format
        }
        if self.api_key:
            kwargs["api_key"] = self.api_key

        for attempt in range(max_retries):
            try:
                response = await acompletion(**kwargs)
                json = response.choices[0].message.content
                return response_format.model_validate_json(json)
            
            except ValidationError as e:
                last_exception = e

            except Exception as e:
                last_exception = e
            print(f"Retrying {attempt}/{max_retries}... : {last_exception}")
        raise last_exception
