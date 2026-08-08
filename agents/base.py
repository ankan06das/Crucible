from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Type
from uuid import uuid4

from google.protobuf import json_format
from google.protobuf.struct_pb2 import Value
from pydantic import BaseModel

from a2a.server.agent_execution.agent_executor import AgentExecutor
from a2a.server.agent_execution.context import RequestContext
from a2a.types.a2a_pb2 import (
    Message,
    Part,
    Role,
    TaskState,
    TaskStatus,
    TaskStatusUpdateEvent,
)

from llm import LLM


@dataclass
class SkillSpec:
    prompt: str
    schema: Type[BaseModel]
    description: str = ""


@dataclass
class AgentSpec:
    name: str
    display_name: str
    description: str
    skills: dict[str, SkillSpec]
    search_hint: str = ""


def review_prompt(display_name: str, focus: str) -> str:
    return _review_prompt(display_name, focus)


def _review_prompt(display_name: str, focus: str) -> str:
    return (
        f"You are the {display_name} Agent on a hackathon idea review panel. {focus} "
        "Evaluate the idea using the provided research fact sheet and the team's stated time, "
        "team size, goals, skills, and constraints.\n\n"
        "FACTUAL DISCIPLINE (mandatory):\n"
        "- Every strength, weakness, and suggestion must be anchored in a specific fact, "
        "statistic, or source from the research brief. Never state unverified numbers as facts.\n"
        "- If a point is your own inference rather than a sourced fact, mark it explicitly as an "
        "'Assumption' in the text.\n"
        "- Prefer hard signals: figures, dates, named libraries/APIs, concrete failure modes.\n"
        "- Do not give generic startup or long-term product advice. Prefer concrete workflow "
        "changes, scope cuts, or implementation moves the team can act on immediately.\n\n"
        "Output requirements:\n"
        "- Set the 'agent' field exactly as instructed.\n"
        "- Use a 0-10 score where 5 means viable but unproven for a hackathon.\n"
        "- Provide 2-4 strengths, 2-4 weaknesses, and 3-5 suggestions, each tied to a fact.\n"
        "- 'key_facts': list the 2-5 concrete facts/figures you relied on, in the same words as "
        "the brief.\n"
        "- 'sources': list the source label for each key fact.\n"
        "- Keep confidence aligned with how constrained or uncertain the plan is.\n\n"
        "Return ONLY valid JSON."
    )


def debate_prompt(display_name: str) -> str:
    return _debate_prompt(display_name)


def _debate_prompt(display_name: str) -> str:
    return (
        f"You are the {display_name} Agent. Below is your original review (with its research "
        "facts) followed by the reviews of every other agent on the panel. This is a hard, "
        "evidence-first debate about which claims survive scrutiny.\n\n"
        "RULES - HARDER BUT FAIR:\n"
        "- Respond to the 1-3 most consequential claims, and attack the WEAKEST, most "
        "unsupported claim in each peer review.\n"
        "- EVERY reply must be anchored to a specific fact, figure, or source from the research "
        "brief or the original reviews. Quote the claim you are disputing.\n"
        "- Explicitly flag unsupported claims: label them 'unsupported claim' and demand a "
        "citation. Do not accept an assertion merely because it sounds reasonable.\n"
        "- Push back with evidence rather than opinion. Do not argue both sides of the same "
        "point.\n"
        "- Concede only when a peer cites a stronger, more verifiable fact than yours; state "
        "exactly which fact changed your mind.\n"
        "- Use 'reply_to' for the other agent's name and 'stance' of 'Agree' or 'Disagree'.\n"
        "Return ONLY a JSON array of debate replies."
    )


def reflect_prompt(display_name: str) -> str:
    return _reflect_prompt(display_name)


def _reflect_prompt(display_name: str) -> str:
    return (
        f"You are the {display_name} Agent. Below is your original review (with its key facts) "
        "plus the full debate transcript, where the hardest evidence-first arguments are "
        "flagged. Revisit your evaluation in light of the debate.\n\n"
        "- Keep, raise, or lower your score, and explain the change only in terms of the "
        "specific cited facts and 'unsupported claim' challenges you heard - not generic "
        "pressure to change.\n"
        "- Discard or demote any of your original suggestions whose factual foundation was "
        "successfully challenged during the debate.\n"
        "- Final suggestions must remain prioritized, deduplicated, and actionable, each "
        "traceable to a fact or a fixed data gap.\n"
        "- State explicitly what changed and which fact drove it.\n"
        "Return ONLY valid JSON."
    )


def gen_debate_prompt(display_name: str, focus: str) -> str:
    return (
        f"You are the {display_name} Agent on the idea generation panel. {focus} Below is your "
        "own candidate proposal and the proposals from the other panelists. Respond to the 1-3 "
        "most important differences that decide which idea is strongest for a hackathon. Do NOT "
        "repeat your whole proposal. EVERY argument MUST reference at least one specific fact or "
        "data gap from the fact sheet (cite the claim) - never argue from vague generalities. If "
        "another proposal is stronger, concede clearly. Use 'reply_to' for the other agent's name "
        "and 'stance' of 'Agree' or 'Disagree'. Return ONLY a JSON array of debate replies."
    )


class CrucibleAgentExecutor(AgentExecutor):
    def __init__(self, llm: LLM, skills: dict[str, SkillSpec], default_skill: str = "review_idea"):
        self.llm = llm
        self.skills = skills
        self.default_skill = default_skill

    def _parse_request(self, context: RequestContext) -> tuple[str, str]:
        skill = self.default_skill
        texts: list[str] = []
        msg = context.message
        if msg:
            for part in msg.parts:
                if part.text:
                    texts.append(part.text)
                elif part.HasField("data"):
                    raw = json.loads(json_format.MessageToJson(part.data))
                    if isinstance(raw, dict) and "skill" in raw:
                        skill = str(raw["skill"])
        return skill, "\n\n".join(t.strip() for t in texts if t.strip())

    async def execute(self, context: RequestContext, event_queue) -> None:
        skill, prompt = self._parse_request(context)
        spec = self.skills.get(skill) or next(iter(self.skills.values()))
        result = await self.llm.generate_json(
            f"{spec.prompt}\n\n{prompt}", spec.schema
        )
        payload = json_format.Parse(result.model_dump_json(), Value())
        response = Message(
            message_id=uuid4().hex,
            context_id=context.context_id,
            task_id=context.task_id,
            role=Role.ROLE_AGENT,
            parts=[Part(data=payload)],
        )
        await event_queue.enqueue_event(response)

    async def cancel(self, context: RequestContext, event_queue) -> None:
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=context.task_id,
                context_id=context.context_id,
                status=TaskStatus(state=TaskState.TASK_STATE_CANCELED),
            )
        )
