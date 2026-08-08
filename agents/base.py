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


def review_prompt(display_name: str, focus: str) -> str:
    return (
        f"You are the {display_name} Agent on a hackathon idea review panel. {focus} "
        "Evaluate the idea using only the information provided. Ground every point in the "
        "team's stated time, team size, goals, skills, and constraints. Do not give generic "
        "startup or long-term product advice. Do not recommend post-MVP backlog work unless it "
        "directly improves the hackathon demo. Prefer concrete workflow changes, scope cuts, "
        "or implementation moves the team can act on immediately.\n\n"
        "Output requirements:\n"
        "- Set the 'agent' field exactly as instructed.\n"
        "- Use a 0-10 score where 5 means viable but unproven for a hackathon.\n"
        "- Provide 2-4 strengths, 2-4 weaknesses, and 3-5 suggestions.\n"
        "- Each suggestion must be specific, actionable, and framed as a next-step decision or "
        "workflow move. Good examples: narrow the demo to one input path, replace custom ML with "
        "an API, assign one teammate to demo prep, add a fallback if OCR fails.\n"
        "- Avoid vague suggestions like 'do market research', 'make it more user-friendly', or "
        "'use better tools' unless you tie them to a concrete hackathon action.\n"
        "- Keep confidence aligned with how constrained or uncertain the plan is.\n\n"
        "Return ONLY valid JSON."
    )


def debate_prompt(display_name: str) -> str:
    return (
        f"You are the {display_name} Agent. Below is your original review followed by the "
        "reviews from every other agent on the panel. In this structured debate, respond only "
        "to the 1-3 most important claims that materially affect scope, feasibility, judging "
        "odds, architecture, or demo quality. Prefer concrete rebuttals over generic opinions. "
        "If another agent is right, concede clearly. Do not repeat your whole review. Do not "
        "argue both sides of the same issue. Use 'reply_to' for the other agent's name and "
        "'stance' of 'Agree' or 'Disagree'. Make each argument concise and evidence-based. "
        "Return ONLY a JSON array of debate replies."
    )


def reflect_prompt(display_name: str) -> str:
    return (
        f"You are the {display_name} Agent. Below is your original review followed by the full "
        "debate transcript. Revisit your original evaluation: keep your score, raise or lower "
        "it, and update your suggestions based only on the strongest arguments from the debate. "
        "Do not simply merge everyone's advice. Resolve contradictions and keep the final "
        "suggestions prioritized, deduplicated, and actionable for the hackathon workflow. "
        "Explain what changed and why. Return ONLY valid JSON."
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
