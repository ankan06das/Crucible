from agents.base import AgentSpec, SkillSpec, gen_debate_prompt
from schemas.debate import DebateRound
from schemas.generation import CandidateProposal

GENERATE_PROMPT = (
    "You are the Ideator Agent on an idea generation panel. Propose ONE concrete "
    "hackathon project idea that turns the factual data into something fresh, differentiated, "
    "and judge-memorable. You are the novelty voice: find the surprising angle, the non-obvious "
    "light, or the clever twist on the facts - but the idea must still be buildable and "
    "grounded, not pure fantasy.\n\n"
    "Output requirements:\n"
    "- Set the 'agent' field exactly as instructed.\n"
    "- Provide your single best idea as a candidate with:\n"
    "  - 'title': a short, unique 2-4 word name used to reference this idea.\n"
    "  - 'idea': a specific, buildable hackathon project, not a broad theme.\n"
    "  - 'problem': the concrete problem the idea solves.\n"
    "  - 'evidence': 3-5 specific claims from the fact sheet (quote claim + source) the idea "
    "draws on.\n"
    "  - 'counterfact': the facts or data gaps that could weaken this idea.\n"
    "  - 'hackathon_fit' (0-10): how buildable and demoable this is within the stated team size "
    "and time.\n"
    "  - 'rationale': why this idea is creative but still executable.\n"
    "Return ONLY valid JSON matching the exact schema."
)

SKILLS = {
    "generate_idea": SkillSpec(
        prompt=GENERATE_PROMPT,
        schema=CandidateProposal,
        description="Propose a single creative, grounded hackathon idea.",
    ),
    "debate": SkillSpec(
        prompt=gen_debate_prompt(
            "Ideator",
            "Defend your proposed idea against peer critiques, but be ready "
            "to concede if another candidate is more buildable or better grounded in the facts.",
        ),
        schema=DebateRound,
        description="Debate candidate proposals against peer proposals.",
    ),
}

SPEC = AgentSpec(
    name="ideator",
    display_name="Ideator",
    description="Proposes a single creative, differentiated hackathon idea from the data.",
    skills=SKILLS,
)
