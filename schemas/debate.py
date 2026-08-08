from enum import Enum

from pydantic import BaseModel, Field, RootModel, model_validator, field_validator


class Stance(str, Enum):
    AGREE = "Agree"
    DISAGREE = "Disagree"


class DebateReply(BaseModel):
    reply_to: str = Field(
        description="The name of the agent this reply is addressed to."
    )
    stance: Stance = Field(description="Whether this reply agrees or disagrees.")
    argument: str = Field(description="The argument, defense, or concession made.")

    @model_validator(mode="before")
    @classmethod
    def _coerce_reasoning_alias(cls, value):
        if isinstance(value, dict):
            wrapper_keys = ("debate_reply", "response")
            for key in wrapper_keys:
                wrapped = value.get(key)
                if isinstance(wrapped, dict):
                    value = wrapped
                    break

            value = dict(value)
            if "reply_to" not in value and "agent" in value:
                value["reply_to"] = value["agent"]
            if "reply_to" not in value and "reply_to_agent" in value:
                value["reply_to"] = value.pop("reply_to_agent")
            if "argument" not in value:
                for key in (
                    "reasoning",
                    "response",
                    "review",
                    "comment",
                    "explanation",
                    "stance_explanation",
                    "rebuttal",
                    "point",
                ):
                    if isinstance(value.get(key), str):
                        value["argument"] = value[key]
                        break
            if "stance" in value and isinstance(value["stance"], str):
                value["stance"] = value["stance"].capitalize()
        return value


class DebateRound(RootModel[list[DebateReply]]):
    root: list[DebateReply] = Field(default_factory=list)

    @field_validator("root", mode="before")
    @classmethod
    def _coerce_single_reply(cls, v):
        if isinstance(v, dict):
            for key in ("replies", "reply", "debate_round"):
                wrapped = v.get(key)
                if isinstance(wrapped, list):
                    return wrapped
                if isinstance(wrapped, dict):
                    return [wrapped]
            if len(v) == 1:
                only_value = next(iter(v.values()))
                if isinstance(only_value, dict):
                    return [only_value]
                if isinstance(only_value, list):
                    return only_value
            if all(isinstance(item, dict) for item in v.values()):
                return list(v.values())
            return [v]
        return v
