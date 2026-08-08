from agents.concluder import SPEC as CONCLUDER
from agents.feasibility import SPEC as FEASIBILITY
from agents.ideator import SPEC as IDEATOR
from agents.impact import SPEC as IMPACT
from agents.innovation import SPEC as INNOVATION
from agents.moderator import SPEC as MODERATOR
from agents.researcher import SPEC as RESEARCHER
from agents.skeptic import SPEC as SKEPTIC
from agents.strategist import SPEC as STRATEGIST
from agents.technical import SPEC as TECHNICAL

REFINE_SPECS = [INNOVATION, FEASIBILITY, IMPACT, TECHNICAL, SKEPTIC]
MODERATOR_SPEC = MODERATOR

GENERATOR_SPECS = [RESEARCHER, IDEATOR, STRATEGIST]
CONCLUDER_SPEC = CONCLUDER

AGENT_SPECS = REFINE_SPECS + [MODERATOR_SPEC] + GENERATOR_SPECS + [CONCLUDER_SPEC]

JUDGE_SPECS = REFINE_SPECS