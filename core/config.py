import os
from dotenv import load_dotenv
from pydantic import Field
from pydantic import model_validator
from pydantic_settings import BaseSettings

load_dotenv()

class LLMSettings(BaseSettings):
    model: str = "NousResearch/Hermes-4-14B"
    api_key: str = ""

    max_retries: int = 5
    max_concurrent_requests: int = Field(default=4, ge=1)

    web_research_enabled: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def _resolve_api_key(self):
        if not self.api_key:
            self.api_key = os.getenv("FEATHERLESS_API_KEY", "")
        return self

class A2ASettings(BaseSettings):
    base_url: str = "http://localhost:8000"
    route_prefix: str = "/agents"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = LLMSettings()
a2a_settings = A2ASettings()
