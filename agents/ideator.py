from agents.base import AgentSpec, SkillSpec, gen_debate_prompt
from schemas.debate import DebateRound
from schemas.generation import IdeaShortlist

GENERATE_PROMPT = (
    "You are the Ideator Agent on an idea generation panel. Propose 4-5 DIFFERENT concrete "
    "hackathon project ideas that turn the factual data into something fresh, differentiated, "
    "and judge-memorable. You are the novelty voice: find the surprising angle, the non-obvious "
    "light, or the clever twist on the facts - but every idea must still be buildable and "
    "grounded, not pure fantasy. Each idea should attack a different angle or audience segment "
    "from the fact sheet.\n\n"
    "Output requirements:\n"
    "- Set the 'agent' field exactly as instructed.\n"
    "- Provide 4-5 distinct ideas in 'ideas'. Each idea is a candidate with:\n"
    "  - 'title': a short, unique 2-4 word name used to reference this idea in debate.\n"
    "  - 'idea': a specific, buildable hackathon project, not a broad theme.\n"
    "  - 'problem': the concrete problem the idea solves.\n"
    "  - 'evidence': 3-5 specific claims from the fact sheet (quote claim + source) the idea "
    "draws on.\n"
    "  - 'counterfact': the facts or data gaps that could weaken this idea.\n"
    "  - 'hackathon_fit' (0-10): how buildable and demoable this is within the stated team size "
    "and time.\n"
    "  - 'rationale': why this idea is creative but still executable.\n"
    "- 'ranking': the titles of all your ideas ordered best to worst.\n"
    "- 'recommended': the title of the single idea you judge strongest.\n"
    "- 'rationale': why your recommended idea is the best, grounded in the facts.\n"
    "Return ONLY valid JSON."
)

SKILLS = {
    "generate_ideas": SkillSpec(
        prompt=GENERATE_PROMPT,
        schema=IdeaShortlist,
        description="Propose 4-5 creative, grounded hackathon ideas and rank them.",
    ),
    "debate": SkillSpec(
        prompt=gen_debate_prompt(
            "Ideator",
            "Defend the shortlist and its recommended idea against peer critiques, but be ready "
            "to concede if another candidate (including another of your own ideas) is more "
            "buildable or better grounded in the facts.",
        ),
        schema=DebateRound,
        description="Debate candidate proposals against peer proposals.",
    ),
}

SPEC = AgentSpec(
    name="ideator",
    display_name="Ideator",
    description="Proposes 4-5 creative, differentiated hackathon ideas from the data.",
    skills=SKILLS,
)
