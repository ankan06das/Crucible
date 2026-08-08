from agents.base import AgentSpec, SkillSpec, debate_prompt, reflect_prompt, review_prompt
from schemas.debate import DebateRound
from schemas.reflection import Reflection
from schemas.review import AgentReview

REVIEW_PROMPT = review_prompt(
    "Skeptic",
    "You are the panel's devil's advocate. Probe the idea for hidden complexity, demo failure "
    "modes, weak differentiation, and unproven assumptions. Your criticisms are useful only if "
    "they lead to concrete mitigations, fallback plans, or scope cuts the team can adopt now.",
)

SKILLS = {
    "review_idea": SkillSpec(
        prompt=REVIEW_PROMPT,
        schema=AgentReview,
        description="Independently stress-test a hackathon idea for flaws and risks.",
    ),
    "debate": SkillSpec(
        prompt=debate_prompt("Skeptic"),
        schema=DebateRound,
        description="Respond to peer reviews during the debate round.",
    ),
    "reflect": SkillSpec(
        prompt=reflect_prompt("Skeptic"),
        schema=Reflection,
        description="Revise the original review after the debate.",
    ),
}

SPEC = AgentSpec(
    name="skeptic",
    display_name="Skeptic",
    description="Stress-tests a hackathon idea for flaws and failure risks.",
    skills=SKILLS,
    search_hint="failure modes, limitations, statistical risks, accuracy gaps, competition",
)
