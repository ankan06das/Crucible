from pydantic import BaseModel, Field


class ModeratorOutput(BaseModel):
    consensus: list[str] = Field(description="Points all agents agree on.")
    disagreements: list[str] = Field(description="Points the agents still disagree on.")
    high_priority_improvements: list[str] = Field(
        description="Improvements to prioritize first."
    )
    tradeoffs: list[str] = Field(description="Tradeoffs the team should be aware of.")
    refined_idea: str = Field(description="The refined project idea.")
    implementation_roadmap: list[str] = Field(
        description="Ordered implementation steps for the refined idea."
    )
