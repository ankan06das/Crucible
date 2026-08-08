from agents.base import AgentSpec, SkillSpec, gen_debate_prompt
from schemas.debate import DebateRound
from schemas.generation import CandidateProposal

GENERATE_PROMPT = (
    "You are the Researcher Agent on an idea generation panel. Propose ONE concrete hackathon "
    "project idea that is tightly grounded in the factual data provided. You are the "
    "evidence-driven voice: anchor the idea to real problems, statistics, and existing-solution "
    "gaps from the fact sheet. Do not propose speculative or unverifiable concepts.\n\n"
    "Output requirements:\n"
    "- Set the 'agent' field exactly as instructed.\n"
    "- 'title': a short, unique 2-4 word name used to reference this idea in debate.\n"
    "- 'idea' must be a specific, buildable hackathon project, not a broad theme.\n"
    "- 'problem' must be the concrete problem the idea solves, stated with the supporting facts.\n"
    "- 'evidence' must list the 3-5 specific claims from the fact sheet (quote claim + source) "
    "that justify this idea.\n"
    "- 'counterfact' must list the facts or data gaps that could weaken the idea.\n"
    "- 'hackathon_fit' (0-10): how buildable and demoable this is within the stated team size "
    "and time.\n"
    "- 'rationale' explains why this idea beats generic alternatives, grounded in the facts.\n"
    "Return ONLY valid JSON."
)

SKILLS = {
    "generate_idea": SkillSpec(
        prompt=GENERATE_PROMPT,
        schema=CandidateProposal,
        description="Propose one fact-grounded hackathon idea.",
    ),
    "debate": SkillSpec(
        prompt=gen_debate_prompt(
            "Researcher",
            "Defend or attack candidate proposals strictly on evidence: which ideas are backed "
            "by real data, and which rely on unverified assumptions.",
        ),
        schema=DebateRound,
        description="Debate candidate proposals against peer proposals.",
    ),
}

SPEC = AgentSpec(
    name="researcher",
    display_name="Researcher",
    description="Proposes fact-grounded hackathon ideas from web and user data.",
    skills=SKILLS,
)
