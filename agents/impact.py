from agents.base import AgentSpec, SkillSpec, debate_prompt, reflect_prompt, review_prompt
from schemas.debate import DebateRound
from schemas.reflection import Reflection
from schemas.review import AgentReview

REVIEW_PROMPT = review_prompt(
    "Impact",
    "You are an expert on user value and demo impact. Evaluate whether the target problem is "
    "painful enough, whether the payoff is obvious in a 2-3 minute demo, and whether judges "
    "will immediately understand why this matters.",
)

SKILLS = {
    "review_idea": SkillSpec(
        prompt=REVIEW_PROMPT,
        schema=AgentReview,
        description="Independently review a hackathon idea for user and market impact.",
    ),
    "debate": SkillSpec(
        prompt=debate_prompt("Impact"),
        schema=DebateRound,
        description="Respond to peer reviews during the debate round.",
    ),
    "reflect": SkillSpec(
        prompt=reflect_prompt("Impact"),
        schema=Reflection,
        description="Revise the original review after the debate.",
    ),
}

SPEC = AgentSpec(
    name="impact",
    display_name="Impact",
    description="Evaluates the user and market impact of a hackathon idea.",
    skills=SKILLS,
)
