from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Awaitable

from a2a_router.client import A2APanelClient
from a2a_router.server import mount
from agents.registry import JUDGE_SPECS, MODERATOR_SPEC
from core.summary import summarize
from core.config import settings
from core.research import research_for_agent
from schemas.debate import DebateRound
from schemas.generation import ResearchBrief
from schemas.moderator import ModeratorOutput
from schemas.reflection import Reflection
from schemas.review import AgentReview

if TYPE_CHECKING:
    from fastapi import FastAPI


@dataclass
class PipelineResult:
    reviews: dict[str, AgentReview] = field(default_factory=dict)
    debate: dict[str, DebateRound] = field(default_factory=dict)
    reflections: dict[str, Reflection] = field(default_factory=dict)
    moderator: ModeratorOutput | None = None
    research: dict[str, ResearchBrief] = field(default_factory=dict)


async def _gather(tasks: dict[str, Awaitable[object]]) -> dict[str, object]:
    names = list(tasks)
    results = await asyncio.gather(*(tasks[name] for name in names))
    return dict(zip(names, results))


def _print_phase(title: str) -> None:
    print(f"\n{'#' * 60}\n# {title}\n{'#' * 60}")


def _print_step(step: str, value: object) -> None:
    print(f"\n--- {step} ---")
    print(summarize(value))


async def _run_tasks(
    title: str,
    tasks: dict[str, Awaitable[object]],
    show_results: bool = False,
) -> dict[str, object]:
    _print_phase(title)
    async def _named(name: str, awaitable: Awaitable[object]) -> tuple[str, object]:
        return name, await awaitable

    pending = [_named(name, task) for name, task in tasks.items()]
    done: dict[str, object] = {}
    for completed in asyncio.as_completed(pending):
        name, value = await completed
        done[name] = value
        print(f"[{title}] {name} finished")
        if show_results:
            _print_step(f"{title} - {name}", value)
    return done


def _format_idea(idea: str) -> str:
    return f"Project idea to evaluate:\n{idea}"


def _render(name: str, value: object) -> str:
    if isinstance(value, list):
        body = "\n".join(f"- {item}" for item in value)
        return f"{name}:\n{body}"
    return f"{name}:\n{value}"


def _join_section(title: str, items: dict[str, object]) -> str:
    blocks = [
        _render(f"### {spec.display_name} Agent", items[spec.name])
        for spec in JUDGE_SPECS
        if spec.name in items
    ]
    return f"## {title}\n" + "\n\n".join(blocks)


def _format_brief(brief: ResearchBrief | None) -> str:
    if not brief:
        return "# Research fact sheet\nNo web research was performed for this review base."
    lines = ["# Research fact sheet", "## Facts"]
    for i, fact in enumerate(brief.facts, 1):
        lines.append(
            f"{i}. [{fact.strength.value}] {fact.claim} (source: {fact.source})"
        )
    lines.append("## Problem signals")
    lines += [f"- {s}" for s in brief.problem_signals]
    lines.append("## Gaps / unverified")
    lines += [f"- {g}" for g in brief.gap_notes]
    return "\n".join(lines)


async def _research_judges(panel, llm, idea: str) -> dict[str, ResearchBrief]:
    if not settings.web_research_enabled:
        return {}
    tasks = {}
    for spec in JUDGE_SPECS:
        tasks[spec.name] = asyncio.create_task(
            research_for_agent(idea, spec.search_hint, llm)
        )
    return await _run_tasks("JUDGE WEB RESEARCH", tasks, show_results=False)


async def _research_judges(llm, idea: str) -> dict[str, ResearchBrief]:
    if not settings.web_research_enabled:
        return {}
    tasks = {}
    for spec in JUDGE_SPECS:
        tasks[spec.name] = asyncio.create_task(
            research_for_agent(idea, spec.search_hint, llm)
        )
    return await _run_tasks("JUDGE WEB RESEARCH", tasks, show_results=False)


async def run_pipeline(
    app: "FastAPI", idea: str, idea_context: str | None = None
) -> PipelineResult:
    from llm import LLM

    cards = mount(app)
    panel = A2APanelClient(app, cards)
    llm = LLM()
    result = PipelineResult()
    try:
        idea_prompt = _format_idea(idea)
        if idea_context:
            idea_prompt = f"{idea_context}\n\n{idea_prompt}"

        # Phase 1b - Independent per-judge web research (parallel, scoped by lens)
        result.research = await _research_judges(llm, idea)

        # Phase 2 - Independent analysis (parallel, groupthink-free)
        review_tasks = {}
        for spec in JUDGE_SPECS:
            brief = result.research.get(spec.name)
            prompt = (
                f"{_format_brief(brief)}\n\n{idea_prompt}"
                if brief
                else idea_prompt
            )
            review_tasks[spec.name] = panel.ask(
                spec.name, prompt, "review_idea", AgentReview
            )
        reviews = await _run_tasks("INDEPENDENT REVIEWS", review_tasks, show_results=True)
        result.reviews = reviews  # type: ignore[assignment]

        # Phase 3 - Debate
        debate_tasks = {}
        for spec in JUDGE_SPECS:
            peers = "\n\n".join(
                f"### {name} Agent review\n{other.model_dump_json(indent=2)}"
                for name, other in reviews.items()
                if name != spec.name
            )
            brief = result.research.get(spec.name)
            own = (
                f"{_format_brief(brief)}\n\n"
                f"Your original review:\n{reviews[spec.name].model_dump_json(indent=2)}"
                if brief
                else f"Your original review:\n{reviews[spec.name].model_dump_json(indent=2)}"
            )
            prompt = f"{own}\n\nOther agents' reviews:\n{peers}"
            debate_tasks[spec.name] = panel.ask(
                spec.name, prompt, "debate", DebateRound
            )
        debates = await _run_tasks("DEBATE", debate_tasks, show_results=True)
        result.debate = debates  # type: ignore[assignment]

        # Phase 4 - Reflection
        reflection_tasks = {}
        for spec in JUDGE_SPECS:
            transcript = _join_section("Debate transcript", debates)
            brief = result.research.get(spec.name)
            own = (
                f"{_format_brief(brief)}\n\n"
                f"Your original review:\n{reviews[spec.name].model_dump_json(indent=2)}\n\n"
                f"Full debate transcript:\n{transcript}"
                if brief
                else (
                    f"Your original review:\n"
                    f"{reviews[spec.name].model_dump_json(indent=2)}\n\n"
                    f"Full debate transcript:\n{transcript}"
                )
            )
            reflection_tasks[spec.name] = panel.ask(
                spec.name, own, "reflect", Reflection
            )
        reflections = await _run_tasks("REFLECTIONS", reflection_tasks, show_results=True)
        result.reflections = reflections  # type: ignore[assignment]

        # Phase 5 - Moderator
        _print_phase("MODERATOR SYNTHESIS")
        moderator_input = "\n\n".join(
            [
                f"Original idea:\n{idea}",
                _join_section("Initial agent reviews", reviews),
                _join_section("Debate transcript", debates),
                _join_section("Final reflected reviews", reflections),
            ]
        )
        result.moderator = await panel.ask(
            MODERATOR_SPEC.name, moderator_input, "moderate", ModeratorOutput
        )  # type: ignore[assignment]
        _print_step("MODERATOR SYNTHESIS", result.moderator)

        from core.artifacts import new_run_id, save_pipeline_result

        path = save_pipeline_result(new_run_id(), result)
        print(f"\nPIPELINE RESULT SAVED -> {path}")

        return result
    finally:
        await panel.close()
