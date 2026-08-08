from agents.base import AgentSpec, SkillSpec
from schemas.generation import GenerationConclusion

CONCLUDE_PROMPT = (
    "You are the Concluder Agent on the idea generation panel. You do NOT invent new ideas or new "
    "criticisms. From the factual fact sheet, the candidate proposals, and the generation debate, "
    "choose the single best hackathon idea.\n\n"
    "Rules:\n"
    "- Pick only from the ideas actually proposed by the panel - do not invent a new idea.\n"
    "- Ground the selection in the decisive facts from the fact sheet and the strongest debate "
    "arguments. Do not add claims the panel did not make.\n"
    "- 'selected_idea' should be a crisp, self-contained hackathon idea statement, ready to be "
    "refined by the review pipeline.\n"
    "- 'ranked_ideas': list every considered idea from best to worst.\n"
    "- 'open_assumptions': list the specific unverified assumptions a team should validate before "
    "building.\n"
    "Return ONLY valid JSON."
)

SPEC = AgentSpec(
    name="concluder",
    display_name="Concluder",
    description="Picks the single best idea from the generation panel's debate.",
    skills={
        "conclude": SkillSpec(
            prompt=CONCLUDE_PROMPT,
            schema=GenerationConclusion,
            description="Select the winning hackathon idea and rank the candidates.",
        )
    },
)