from pydantic import BaseModel, Field
from enum import Enum
from uuid import UUID
import uuid6

class IdeaStatus(str, Enum):
    SUBMITTED = "submitted"
    # Rest adding later

class IdeaResponse(BaseModel): # from the user
    idea: str = Field(description="The project idea proposed by the user.")
    theme: str = Field(default=None, description="Domain or category of the project idea.")
    team_size: int = Field(default=None, ge=1,description="The number of people working on the project.")
    time: int = Field(default=None, gt=0,description="The estimated time to complete the project in hours.")
    goals: str | None = Field(default=None, description="The specific objectives or outcomes")
    constraints: str | None = Field(default=None, description="Budget, technology, legal or hardware constraints.")
    
class Idea(IdeaResponse):
    id: UUID = Field(default_factory=uuid6, description="Server-generated UUID")
    status: IdeaStatus = IdeaStatus.SUBMITTED