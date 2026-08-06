import os
from dotenv import load_dotenv
from pydantic import model_validator
from pydantic_settings import BaseSettings

load_dotenv()

class LLMSettings(BaseSettings):
    provider: str = "gemini"
    model: str = "gemini/gemini-2.5-flash"
    api_key: str = ""

    max_retries: int = 5
    
    model_config = {"env_file": ".env", "extra": "ignore"}

    @model_validator(mode="after")
    def _resolve_api_key(self):
        if not self.api_key:
            env_name = f"{self.provider.replace('-', '_').upper()}_API_KEY"
            self.api_key = os.getenv(env_name, "")
        return self

settings = LLMSettings()