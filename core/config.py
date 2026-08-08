import os
from dotenv import load_dotenv
from pydantic import model_validator
from pydantic_settings import BaseSettings

load_dotenv()

class LLMSettings(BaseSettings):
    model: str = "meta/llama-3.1-8b-instruct"
    api_key: str = ""

    max_retries: int = 5

    web_research_enabled: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def _resolve_api_key(self):
        if not self.api_key:
            self.api_key = os.getenv("NVIDIA_API_KEY", "")
        return self

class A2ASettings(BaseSettings):
    base_url: str = "http://localhost:8000"
    route_prefix: str = "/agents"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = LLMSettings()
a2a_settings = A2ASettings()