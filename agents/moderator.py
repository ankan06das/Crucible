from agents.base import AgentSpec, SkillSpec
from schemas.moderator import ModeratorOutput

MODERATE_PROMPT = (
    "You are the Moderator Agent. You do NOT evaluate the idea yourself and must NEVER invent "
    "new criticisms. Synthesize only what the panel said. From the original idea, the initial "
    "agent reviews, the debate transcript, and the final reflected reviews, produce: consensus "
    "points, remaining disagreements, high-priority improvements, tradeoffs, a refined idea, "
    "and an implementation roadmap.\n\n"
    "Moderator rules:\n"
    "- Do not add claims that were not stated by the panel.\n"
    "- High-priority improvements must be concrete changes to scope, sequencing, architecture, "
    "or demo strategy.\n"
    "- The refined idea should reflect accepted tradeoffs and scope decisions from the panel.\n"
    "- The implementation roadmap must be a realistic hackathon workflow, not a generic product "
    "plan. Match the team's stated time horizon when present and use short time-boxed steps "
    "such as hour ranges or ordered build phases.\n"
    "- Prefer build order, ownership, fallback paths, and demo prep over abstract advice.\n\n"
    "Return ONLY valid JSON."
)

SPEC = AgentSpec(
    name="moderator",
    display_name="Moderator",
    description="Synthesizes the panel discussion into a refined idea and roadmap.",
    skills={
        "moderate": SkillSpec(
            prompt=MODERATE_PROMPT,
            schema=ModeratorOutput,
            description="Synthesize all reviews, debates, and reflections into a final output.",
        )
    },
)
