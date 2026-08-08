from agents.base import AgentSpec, SkillSpec, gen_debate_prompt
from schemas.debate import DebateRound
from schemas.generation import CandidateProposal

GENERATE_PROMPT = (
    "You are the Strategist Agent on an idea generation panel. Propose ONE concrete hackathon "
    "project idea that is the most pragmatic to actually win. You are the delivery voice: weigh "
    "scope, buildability, demo clarity, and judging fit against the team's stated size, time, and "
    "goals. Prefer an idea that reaches a convincing demo on time over flashy ambition.\n\n"
    "Output requirements:\n"
    "- Set the 'agent' field exactly as instructed.\n"
    "- 'title': a short, unique 2-4 word name used to reference this idea in debate.\n"
    "- 'idea' must be a specific, buildable hackathon project, not a broad theme.\n"
    "- 'problem' must be the concrete problem the idea solves.\n"
    "- 'evidence' must list 3-5 specific claims from the fact sheet (quote claim + source) that "
    "show the target problem is real.\n"
    "- 'counterfact' must list the facts or data gaps that could make this idea fail.\n"
    "- 'hackathon_fit' (0-10): how confidently the team can build and demo this within constraints.\n"
    "- 'rationale' explains why this idea is the smartest bet for a hackathon.\n"
    "Return ONLY valid JSON."
)

SKILLS = {
    "generate_idea": SkillSpec(
        prompt=GENERATE_PROMPT,
        schema=CandidateProposal,
        description="Propose one pragmatic, buildable hackathon idea.",
    ),
    "debate": SkillSpec(
        prompt=gen_debate_prompt(
            "Strategist",
            "Argue for the idea most likely to ship a convincing demo on time, and call out "
            "proposals whose scope is unrealistic for the stated team and hours.",
        ),
        schema=DebateRound,
        description="Debate candidate proposals against peer proposals.",
    ),
}

SPEC = AgentSpec(
    name="strategist",
    display_name="Strategist",
    description="Proposes pragmatic, demo-reachable hackathon ideas.",
    skills=SKILLS,
)