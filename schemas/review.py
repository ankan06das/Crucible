from pydantic import BaseModel, Field, field_validator


class AgentReview(BaseModel):
    agent: str = Field(description="The name of the agent providing the review.")
    score: int = Field(ge=0, le=10, description="Overall score from 0 to 10.")
    strengths: list[str] = Field(description="Strong points of the idea.")
    weaknesses: list[str] = Field(description="Weak points of the idea.")
    suggestions: list[str] = Field(
        description="Concrete, actionable suggestions to improve the idea."
    )
    confidence: float = Field(
        ge=0, le=1, description="Confidence in this review from 0.0 to 1.0."
    )

    @field_validator("score", mode="before")
    @classmethod
    def _coerce_score_to_int(cls, value):
        if isinstance(value, float):
            return round(value)
        return value

    @field_validator("strengths", "weaknesses", "suggestions", mode="before")
    @classmethod
    def _coerce_string_lists(cls, value):
        if not isinstance(value, list):
            return value

        def _stringify(item) -> str:
            if isinstance(item, str):
                return item
            if isinstance(item, dict):
                parts = [str(v).strip() for v in item.values() if str(v).strip()]
                return " - ".join(parts) if parts else str(item)
            return str(item)

        return [_stringify(item) for item in value]
