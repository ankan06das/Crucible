from pydantic import BaseModel, Field, field_validator


class Reflection(BaseModel):
    old_score: int = Field(ge=0, le=10, description="The score given before the debate.")
    new_score: int = Field(ge=0, le=10, description="The score after the debate.")
    reason: str = Field(description="Why the score changed or stayed the same.")
    updated_suggestions: list[str] = Field(
        description="Revised suggestions after hearing the debate."
    )

    @field_validator("old_score", "new_score", mode="before")
    @classmethod
    def _coerce_scores_to_int(cls, value):
        if isinstance(value, float):
            return round(value)
        return value
