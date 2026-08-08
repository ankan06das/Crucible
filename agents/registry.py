from agents.feasibility import SPEC as FEASIBILITY
from agents.impact import SPEC as IMPACT
from agents.innovation import SPEC as INNOVATION
from agents.moderator import SPEC as MODERATOR
from agents.skeptic import SPEC as SKEPTIC
from agents.technical import SPEC as TECHNICAL

AGENT_SPECS = [INNOVATION, FEASIBILITY, IMPACT, TECHNICAL, SKEPTIC, MODERATOR]

JUDGE_SPECS = [s for s in AGENT_SPECS if s.name != "moderator"]
MODERATOR_SPEC = MODERATOR
