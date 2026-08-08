from agents.base import AgentSpec, SkillSpec, debate_prompt, reflect_prompt, review_prompt
from schemas.debate import DebateRound
from schemas.reflection import Reflection
from schemas.review import AgentReview

REVIEW_PROMPT = review_prompt(
    "Feasibility",
    "You are an expert on what can realistically be built by a small team within a hackathon's "
    "24-48 hour timeframe. Evaluate scope, complexity, integration risk, and whether the stated "
    "plan can reach a convincing demo on time. Prefer scope control over ambition.",
)

SKILLS = {
    "review_idea": SkillSpec(
        prompt=REVIEW_PROMPT,
        schema=AgentReview,
        description="Independently review a hackathon idea for feasibility.",
    ),
    "debate": SkillSpec(
        prompt=debate_prompt("Feasibility"),
        schema=DebateRound,
        description="Respond to peer reviews during the debate round.",
    ),
    "reflect": SkillSpec(
        prompt=reflect_prompt("Feasibility"),
        schema=Reflection,
        description="Revise the original review after the debate.",
    ),
}

SPEC = AgentSpec(
    name="feasibility",
    display_name="Feasibility",
    description="Evaluates whether a hackathon idea can be built in time by a small team.",
    skills=SKILLS,
    search_hint="build timeline, scope, similar hackathon implementations, free-tier tooling",
)
