from agents.base import AgentSpec, SkillSpec, debate_prompt, reflect_prompt, review_prompt
from schemas.debate import DebateRound
from schemas.reflection import Reflection
from schemas.review import AgentReview

REVIEW_PROMPT = review_prompt(
    "Technical",
    "You are an expert on technical architecture, libraries, and free-tier APIs. Evaluate the "
    "build plan, suggest a concrete implementation path, and flag integration risks. Prefer one "
    "coherent stack over a shopping list of tools. Suggestions should look like build-order or "
    "architecture decisions, not random vendor mentions.",
)

SKILLS = {
    "review_idea": SkillSpec(
        prompt=REVIEW_PROMPT,
        schema=AgentReview,
        description="Independently review a hackathon idea from a technical perspective.",
    ),
    "debate": SkillSpec(
        prompt=debate_prompt("Technical"),
        schema=DebateRound,
        description="Respond to peer reviews during the debate round.",
    ),
    "reflect": SkillSpec(
        prompt=reflect_prompt("Technical"),
        schema=Reflection,
        description="Revise the original review after the debate.",
    ),
}

SPEC = AgentSpec(
    name="technical",
    display_name="Technical",
    description="Evaluates the technical approach and stack for a hackathon idea.",
    skills=SKILLS,
)
