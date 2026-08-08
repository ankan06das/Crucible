from enum import Enum

from pydantic import BaseModel, Field, field_validator

from schemas.debate import DebateRound
from schemas.moderator import ModeratorOutput
from schemas.reflection import Reflection
from schemas.review import AgentReview


class FactStrength(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Fact(BaseModel):
    claim: str = Field(description="A concrete, verifiable claim.")
    source: str = Field(description="Where the claim came from (URL or source label).")
    strength: FactStrength = Field(
        default=FactStrength.MEDIUM,
        description="Reliability of the fact: high/medium/low.",
    )

    @field_validator("strength", mode="before")
    @classmethod
    def _coerce_strength(cls, value):
        if isinstance(value, str):
            return value.lower()
        return value


class ResearchBrief(BaseModel):
    facts: list[Fact] = Field(
        default_factory=list,
        description="Concrete facts gathered from web and user-provided sources.",
    )
    problem_signals: list[str] = Field(
        default_factory=list,
        description="Observable problems the material suggests.",
    )
    gap_notes: list[str] = Field(
        default_factory=list,
        description="What the sources did not cover or data that is unclear.",
    )
    sources: list[str] = Field(default_factory=list)


class CandidateProposal(BaseModel):
    agent: str = Field(description="The name of the proposing agent.")
    title: str = Field(
        description="A short, unique 2-4 word title used to reference this idea in debate and ranking."
    )
    idea: str = Field(
        description="A specific, buildable hackathon project idea, not a broad theme."
    )
    problem: str = Field(
        description="The concrete problem the idea solves, stated with supporting facts."
    )
    evidence: list[str] = Field(
        description="The 3-5 specific claims from the fact sheet justifying this idea."
    )
    counterfact: list[str] = Field(
        description="Facts or data gaps that could weaken the idea."
    )
    hackathon_fit: int = Field(
        ge=0,
        le=10,
        description="How buildable and demoable this is for a hackathon (0-10).",
    )
    rationale: str = Field(
        description="Why this idea is the best candidate, grounded in the facts."
    )

    @field_validator("hackathon_fit", mode="before")
    @classmethod
    def _coerce_fit_to_int(cls, value):
        if isinstance(value, float):
            return round(value)
        return value


class IdeaShortlist(BaseModel):
    agent: str = Field(description="The name of the proposing agent (Ideator).")
    ideas: list[CandidateProposal] = Field(
        description="4-5 distinct candidate hackathon ideas, each with a unique title."
    )
    ranking: list[str] = Field(
        description="The titles of the ideas ranked best to worst."
    )
    recommended: str = Field(
        description="The title of the idea this agent judges best."
    )
    rationale: str = Field(
        description="Why the recommended idea is strongest, grounded in the facts."
    )


class GenerationRequest(BaseModel):
    topic: str = Field(
        description="The domain or problem area to generate hackathon ideas for."
    )
    urls: list[str] | None = Field(
        default=None,
        description="Optional factual sources (URLs or pasted docs) to ground generation.",
    )
    theme: str | None = Field(default=None)
    team_size: int | None = Field(default=None, ge=1)
    time_hours: int | None = Field(default=None, gt=0)
    goals: str | None = Field(default=None)
    constraints: str | None = Field(default=None)


class GenerationConclusion(BaseModel):
    selected_idea: str = Field(
        description="The single chosen hackathon idea from the proposed candidates."
    )
    rationale: str = Field(
        description="Why this idea won the generation debate, grounded in facts."
    )
    key_facts: list[str] = Field(
        description="The decisive facts behind the selection."
    )
    ranked_ideas: list[str] = Field(
        description="All considered ideas ranked best to worst."
    )
    open_assumptions: list[str] = Field(
        description="Unverified assumptions the team should validate before building."
    )


class GenerationResult(BaseModel):
    research: ResearchBrief = Field(
        description="The factual data gathered before generation."
    )
    shortlist: IdeaShortlist | None = Field(
        default=None,
        description="The Ideator's 4-5 idea shortlist, if present.",
    )
    candidates: list[CandidateProposal] = Field(
        default_factory=list,
        description="The pooled candidate ideas fed to the debate and Concluder.",
    )
    proposals: dict[str, CandidateProposal | IdeaShortlist] = Field(
        description="The raw per-persona generation outputs (Ideator = shortlist)."
    )
    debates: dict[str, DebateRound] = Field(
        description="The generation panel's structured debate."
    )
    conclusion: GenerationConclusion = Field(
        description="The topic conclusion selected by the panel."
    )
    refined_reviews: dict[str, AgentReview] = Field(default_factory=dict)
    refined_debates: dict[str, DebateRound] = Field(default_factory=dict)
    refined_reflections: dict[str, Reflection] = Field(default_factory=dict)
    moderator: ModeratorOutput | None = Field(
        default=None,
        description="The refinement pipeline's moderator synthesis for the selected idea.",
    )
