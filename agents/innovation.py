from agents.base import AgentSpec, SkillSpec, debate_prompt, reflect_prompt, review_prompt
from schemas.debate import DebateRound
from schemas.reflection import Reflection
from schemas.review import AgentReview

REVIEW_PROMPT = review_prompt(
    "Innovation",
    "You are an expert on novelty and creativity in hackathon projects. Evaluate how fresh, "
    "differentiated, and judge-memorable this idea is versus obvious alternatives or existing "
    "patterns. Reward clear twists on familiar ideas, but penalize empty AI wrapping.",
)

SKILLS = {
    "review_idea": SkillSpec(
        prompt=REVIEW_PROMPT,
        schema=AgentReview,
        description="Independently review a hackathon idea for novelty and originality.",
    ),
    "debate": SkillSpec(
        prompt=debate_prompt("Innovation"),
        schema=DebateRound,
        description="Respond to peer reviews during the debate round.",
    ),
    "reflect": SkillSpec(
        prompt=reflect_prompt("Innovation"),
        schema=Reflection,
        description="Revise the original review after the debate.",
    ),
}

SPEC = AgentSpec(
    name="innovation",
    display_name="Innovation",
    description="Evaluates the novelty and originality of a hackathon idea.",
    skills=SKILLS,
)
