from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Awaitable, Callable

from a2a_router.client import A2APanelClient
from a2a_router.server import mount
from agents.registry import CONCLUDER_SPEC, GENERATOR_SPECS
from core.research import research_topic
from core.summary import summarize
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

# Per-persona generation skill + schema
GEN_SKILLS: dict[str, tuple[str, type]] = {
    "ideator": ("generate_idea", CandidateProposal),
    "researcher": ("generate_idea", CandidateProposal),
    "strategist": ("generate_idea", CandidateProposal),
}


def _print_phase(title: str) -> None:
    print(f"\n{'#' * 60}\n# {title}\n{'#' * 60}")


def _print_step(step: str, value: object) -> None:
    print(f"\n--- {step} ---")
    print(summarize(value))


async def _emit_phase(
    emit: Callable[[dict], Awaitable[None]] | None,
    phase: str,
    title: str | None = None,
) -> None:
    if emit:
        await emit({"type": "phase_start", "phase": phase, "title": title or phase})


async def _run_tasks(
    title: str,
    tasks: dict[str, asyncio.Task],
    show_results: bool = False,
    emit: Callable[[dict], Awaitable[None]] | None = None,
    phase: str | None = None,
) -> dict[str, object]:
    _print_phase(title)
    phase = phase or title.lower().replace(" ", "_")
    name_by_task = {task: name for name, task in tasks.items()}
    done: dict[str, object] = {}
    async for completed in asyncio.as_completed(tasks.values()):
        name = name_by_task[completed]
        value = await completed
        done[name] = value
        print(f"[{title}] {name} finished")
        if emit:
            data = value.model_dump() if hasattr(value, "model_dump") else value
            await emit(
                {"type": "agent_done", "phase": phase, "agent": name, "data": data}
            )
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
    app: "FastAPI",
    req: GenerationRequest,
    llm: LLM | None = None,
    emit: Callable[[dict], Awaitable[None]] | None = None,
) -> dict[str, object]:
    llm = llm or LLM()
    cards = mount(app, llm=llm)
    panel = A2APanelClient(app, cards)
    try:
        _print_phase("FACTUAL DATA COLLECTION")
        await _emit_phase(emit, "research", "Web Research")
        brief = await research_topic(req.topic, req.urls, llm)
        _print_step("FACT SHEET", brief)
        fact_sheet = _format_fact_sheet(brief)
        context = _format_context(req)

        # Parallel independent generation (groupthink-free)
        await _emit_phase(emit, "proposal", "Idea Proposals")
        proposal_tasks = {}
        for spec in GENERATOR_SPECS:
            skill, schema = GEN_SKILLS[spec.name]
            proposal_tasks[spec.name] = asyncio.create_task(
                panel.ask(spec.name, f"{fact_sheet}\n\n{context}", skill, schema)
            )
        proposals = await _run_tasks(
            "IDEA PROPOSALS",
            proposal_tasks,
            show_results=True,
            emit=emit,
            phase="proposal",
        )

        candidates = _unpack_proposals(proposals)
        candidate_board = _format_candidates(candidates)

        # Generation debate: everyone argues over the pooled candidate board by title
        await _emit_phase(emit, "debate", "Generation Debate")
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
        debates = await _run_tasks(
            "GENERATION DEBATE",
            debate_tasks,
            show_results=True,
            emit=emit,
            phase="debate",
        )

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
    app: "FastAPI",
    req: GenerationRequest,
    llm: LLM | None = None,
    emit: Callable[[dict], Awaitable[None]] | None = None,
) -> GenerationResult:
    llm = llm or LLM()
    cards = mount(app, llm=llm)
    panel = A2APanelClient(app, cards)
    try:
        _print_phase("FACTUAL DATA COLLECTION")
        await _emit_phase(emit, "research", "Web Research")
        brief = await research_topic(req.topic, req.urls, llm)
        _print_step("FACT SHEET", brief)
        fact_sheet = _format_fact_sheet(brief)
        context = _format_context(req)

        # Single independent generation
        await _emit_phase(emit, "proposal", "Idea Proposals")
        ideator_spec = next((s for s in GENERATOR_SPECS if s.name == "ideator"), GENERATOR_SPECS[1])
        proposal = await panel.ask(
            ideator_spec.name,
            f"{fact_sheet}\n\n{context}",
            "generate_idea",
            CandidateProposal
        )
        _print_step("IDEA PROPOSAL", proposal)
        if emit:
            await emit({"type": "agent_done", "phase": "proposal", "agent": ideator_spec.name, "data": proposal.model_dump()})

        # Auto-feed into the refinement pipeline
        _print_phase("REFINEMENT PIPELINE")
        refined = await run_pipeline(
            app,
            proposal.title, # Using the single idea's title
            idea_context=context,
            emit=emit,
        )

        result = GenerationResult(
            research=brief,
            shortlist=None,
            candidates=[proposal],
            proposals={ideator_spec.name: proposal},
            debates={},
            conclusion=GenerationConclusion(
                selected_idea=proposal.title,
                rationale="Only one idea generated.",
                key_facts=[],
                ranked_ideas=[proposal.title],
                open_assumptions=[]
            ),
            refined_reviews=refined.reviews,
            refined_debates=refined.debate,
            refined_reflections=refined.reflections,
            moderator=refined.moderator
        )

        from core.artifacts import new_run_id, save_generation_result
        save_generation_result(new_run_id("gen"), result)
        return result
    finally:
        await panel.close()