from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from a2a_router.client import A2APanelClient
from a2a_router.server import mount
from agents.registry import CONCLUDER_SPEC, GENERATOR_SPECS
from core.research import research_topic
from llm import LLM
from orchestrator import run_pipeline
from schemas.debate import DebateRound
from schemas.generation import (
    CandidateProposal,
    GenerationConclusion,
    GenerationRequest,
    GenerationResult,
    IdeaShortlist,
)

if TYPE_CHECKING:
    from fastapi import FastAPI

# Per-persona generation skill + schema. Ideator shortlists 4-5; the others propose one.
GEN_SKILLS: dict[str, tuple[str, type]] = {
    "ideator": ("generate_ideas", IdeaShortlist),
    "researcher": ("generate_idea", CandidateProposal),
    "strategist": ("generate_idea", CandidateProposal),
}


def _print_phase(title: str) -> None:
    print(f"\n{'#' * 60}\n# {title}\n{'#' * 60}")


def _print_step(step: str, value: object) -> None:
    print(f"\n--- {step} ---")
    if isinstance(value, list):
        for item in value:
            print(f"- {item}")
    else:
        print(value.model_dump_json(indent=2))


async def _run_tasks(
    title: str,
    tasks: dict[str, asyncio.Task],
    show_results: bool = False,
) -> dict[str, object]:
    _print_phase(title)
    name_by_task = {task: name for name, task in tasks.items()}
    done: dict[str, object] = {}
    async for completed in asyncio.as_completed(tasks.values()):
        name = name_by_task[completed]
        value = await completed
        done[name] = value
        print(f"[{title}] {name} finished")
        if show_results:
            _print_step(f"{title} - {name}", value)
    return done


def _format_fact_sheet(brief) -> str:
    lines = ["# Fact sheet", "## Facts"]
    for i, fact in enumerate(brief.facts, 1):
        lines.append(f"{i}. [{fact.strength.value}] {fact.claim} (source: {fact.source})")
    lines.append("## Problem signals")
    lines += [f"- {s}" for s in brief.problem_signals]
    lines.append("## Data gaps")
    lines += [f"- {g}" for g in brief.gap_notes]
    return "\n".join(lines)


def _format_context(req: GenerationRequest) -> str:
    lines = [f"Topic: {req.topic}"]
    if req.theme:
        lines.append(f"Theme: {req.theme}")
    if req.team_size:
        lines.append(f"Team size: {req.team_size}")
    if req.time_hours:
        lines.append(f"Time available: {req.time_hours} hours")
    if req.goals:
        lines.append(f"Goals: {req.goals}")
    if req.constraints:
        lines.append(f"Constraints: {req.constraints}")
    return "\n".join(lines)


def _format_candidates(candidates: list[CandidateProposal]) -> str:
    lines = ["## Candidate ideas"]
    for i, c in enumerate(candidates, 1):
        lines.append(
            f"{i}. [{c.title}] {c.idea} | fit={c.hackathon_fit}/10 | by {c.agent}"
        )
    return "\n".join(lines)


def _unpack_proposals(proposals: dict[str, object]) -> list[CandidateProposal]:
    candidates: list[CandidateProposal] = []
    for key, value in proposals.items():
        if isinstance(value, IdeaShortlist):
            candidates.extend(value.ideas)
        elif isinstance(value, CandidateProposal):
            candidates.append(value)
        else:
            raise TypeError(f"Unexpected proposal output for '{key}': {type(value).__name__}")
    return candidates


async def generate_candidates(
    app: "FastAPI", req: GenerationRequest, llm: LLM | None = None
) -> dict[str, object]:
    llm = llm or LLM()
    cards = mount(app, llm=llm)
    panel = A2APanelClient(app, cards)
    try:
        _print_phase("FACTUAL DATA COLLECTION")
        brief = await research_topic(req.topic, req.urls, llm)
        _print_step("FACT SHEET", brief)
        fact_sheet = _format_fact_sheet(brief)
        context = _format_context(req)

        # Parallel independent generation (groupthink-free)
        proposal_tasks = {}
        for spec in GENERATOR_SPECS:
            skill, schema = GEN_SKILLS[spec.name]
            proposal_tasks[spec.name] = asyncio.create_task(
                panel.ask(spec.name, f"{fact_sheet}\n\n{context}", skill, schema)
            )
        proposals = await _run_tasks("IDEA PROPOSALS", proposal_tasks, show_results=True)

        candidates = _unpack_proposals(proposals)
        candidate_board = _format_candidates(candidates)

        # Generation debate: everyone argues over the pooled candidate board by title
        debate_tasks = {}
        for spec in GENERATOR_SPECS:
            prompt = (
                f"{fact_sheet}\n\n{candidate_board}\n\n"
                f"Your full output:\n{proposals[spec.name].model_dump_json(indent=2)}\n\n"
                f"Debate the candidate ideas by title. Ground every argument in a fact or data "
                f"gap and defend or attack the strongest candidates for a hackathon."
            )
            debate_tasks[spec.name] = asyncio.create_task(
                panel.ask(spec.name, prompt, "debate", DebateRound)
            )
        debates = await _run_tasks("GENERATION DEBATE", debate_tasks, show_results=True)

        # Return data to store in projects
        return {
            "research": brief.model_dump() if brief else None,
            "candidates": [c.model_dump() for c in candidates],
            "proposals": {k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in proposals.items()},
            "debates": {k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in debates.items()},
            "context": context
        }
    finally:
        await panel.close()


async def generate_idea(
    app: "FastAPI", req: GenerationRequest, llm: LLM | None = None
) -> GenerationResult:
    llm = llm or LLM()
    cards = mount(app, llm=llm)
    panel = A2APanelClient(app, cards)
    try:
        _print_phase("FACTUAL DATA COLLECTION")
        brief = await research_topic(req.topic, req.urls, llm)
        _print_step("FACT SHEET", brief)
        fact_sheet = _format_fact_sheet(brief)
        context = _format_context(req)

        # Parallel independent generation (groupthink-free)
        proposal_tasks = {}
        for spec in GENERATOR_SPECS:
            skill, schema = GEN_SKILLS[spec.name]
            proposal_tasks[spec.name] = asyncio.create_task(
                panel.ask(spec.name, f"{fact_sheet}\n\n{context}", skill, schema)
            )
        proposals = await _run_tasks("IDEA PROPOSALS", proposal_tasks, show_results=True)

        candidates = _unpack_proposals(proposals)
        candidate_board = _format_candidates(candidates)

        # Generation debate: everyone argues over the pooled candidate board by title
        debate_tasks = {}
        for spec in GENERATOR_SPECS:
            prompt = (
                f"{fact_sheet}\n\n{candidate_board}\n\n"
                f"Your full output:\n{proposals[spec.name].model_dump_json(indent=2)}\n\n"
                f"Debate the candidate ideas by title. Ground every argument in a fact or data "
                f"gap and defend or attack the strongest candidates for a hackathon."
            )
            debate_tasks[spec.name] = asyncio.create_task(
                panel.ask(spec.name, prompt, "debate", DebateRound)
            )
        debates = await _run_tasks("GENERATION DEBATE", debate_tasks, show_results=True)

        # Concluder picks the topic from the full pool
        _print_phase("GENERATION CONCLUSION")
        concluder_input = "\n\n".join(
            [
                f"Topic:\n{req.topic}",
                fact_sheet,
                candidate_board,
                "\n".join(
                    f"### {spec.display_name} Agent debate\n{debates[spec.name]}"
                    for spec in GENERATOR_SPECS
                ),
            ]
        )
        conclusion = await panel.ask(
            CONCLUDER_SPEC.name, concluder_input, "conclude", GenerationConclusion
        )
        _print_step("GENERATION CONCLUSION", conclusion)

        # Auto-feed into the refinement pipeline
        _print_phase("REFINEMENT PIPELINE")
        refined = await run_pipeline(
            app,
            conclusion.selected_idea,
            idea_context=context,
        )

        shortlist = next(
            (v for v in proposals.values() if isinstance(v, IdeaShortlist)), None
        )
        result = GenerationResult(
            research=brief,
            shortlist=shortlist,
            candidates=candidates,
            proposals=proposals,  # type: ignore[arg-type]
            debates=debates,  # type: ignore[arg-type]
            conclusion=conclusion,
            refined_reviews=refined.reviews,
            refined_debates=refined.debate,
            refined_reflections=refined.reflections,
            moderator=refined.moderator,
        )

        from core.artifacts import new_run_id, save_generation_result

        path = save_generation_result(new_run_id(), result)
        print(f"\nGENERATION RESULT SAVED -> {path}")
        return result
    finally:
        await panel.close()