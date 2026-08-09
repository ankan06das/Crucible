"""Concise, human-readable summaries of pipeline result objects.

The debate/generation pipelines may print raw JSON (`model_dump_json`)
to stdout, which then flows into the UI's live agent feed as noise. These
helpers collapse each structured result into the *main message* an agent is
trying to convey, so only readable summaries are surfaced.
"""

from __future__ import annotations


def _dump(value: object):
    return value.model_dump() if hasattr(value, "model_dump") else value


def _text(value, limit: int = 300) -> str:
    if hasattr(value, "value"):
        value = value.value
    return _clip(value, limit)


def _clip(text, limit: int = 300) -> str:
    text = str(text or "").replace("\n", " ").strip()
    if not text:
        return ""
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _bullet(label: str, items) -> str:
    items = [str(i).strip() for i in (items or []) if str(i).strip()]
    if not items:
        return ""
    return f"{label}: " + " · ".join(_clip(i, 140) for i in items)


def _join(parts) -> str:
    return "\n".join(p for p in parts if p)


def _parts(d: dict) -> list[str]:
    parts: list[str] = []

    # Debate reply
    if "argument" in d or "reply_to" in d:
        stance = _text(d.get("stance") or "Comment")
        argument = _text(d.get("argument") or d.get("reasoning") or "")
        return [f"→ {_text(d.get('reply_to'))} ({stance}): {argument}"]

    # Agent review
    if "score" in d and "strengths" in d:
        parts.append(f"Score {d.get('score')}/10 (confidence {d.get('confidence')})")
        parts.append(_bullet("Strengths", d.get("strengths")))
        parts.append(_bullet("Weaknesses", d.get("weaknesses")))
        parts.append(_bullet("Suggestions", d.get("suggestions")))
        parts.append(_bullet("Key facts", d.get("key_facts")))
        return parts

    # Reflection
    if "old_score" in d or "new_score" in d:
        parts.append(f"Score {d.get('old_score')} → {d.get('new_score')}/10")
        if d.get("reason"):
            parts.append(_clip(d.get("reason")))
        parts.append(_bullet("Updated suggestions", d.get("updated_suggestions")))
        return parts

    # Moderator synthesis
    if "refined_idea" in d:
        parts.append(f"Refined idea: {_clip(d.get('refined_idea'))}")
        parts.append(_bullet("Consensus", d.get("consensus")))
        parts.append(_bullet("Priorities", d.get("high_priority_improvements")))
        parts.append(_bullet("Still contested", d.get("disagreements")))
        parts.append(_bullet("Tradeoffs", d.get("tradeoffs")))
        parts += [
            f"  {i}. {_clip(step)}"
            for i, step in enumerate((d.get("implementation_roadmap") or []), 1)
        ]
        return parts

    return []


def summarize(value) -> str:
    d = _dump(value)

    # ResearchFact sheet
    if isinstance(d, dict) and "facts" in d:
        lines = []
        for fact in (d.get("facts") or [])[:6]:
            f = _dump(fact) if isinstance(fact, dict) else {}
            lines.append(
                f"• {_clip(f.get('claim'), 220)} "
                f"[{f.get('strength')}] — {_clip(f.get('source'), 80)}"
            )
        signals = _clip(" · ".join(d.get("problem_signals") or []))
        gaps = _clip(" · ".join(d.get("gap_notes") or []))
        if signals:
            lines.append(f"Problem signals: {signals}")
        if gaps:
            lines.append(f"Data gaps: {gaps}")
        return "\n".join(lines) if lines else "Fact sheet complete."

    # CandidateProposal / shortlist item
    if isinstance(d, dict) and "title" in d and "idea" in d:
        line = f"{d.get('title')} · fit {d.get('hackathon_fit')}/10 — {_clip(d.get('idea'))}"
        if d.get("rationale"):
            line += f" ({_clip(d.get('rationale'), 180)})"
        return line

    # DebateRound (list of replies) or any list
    if isinstance(d, list):
        return "\n".join(str(_item_summary(x)) for x in d)

    return _join(_parts(d)) or "Complete."


def _item_summary(value) -> str:
    d = _dump(value)
    if isinstance(d, dict):
        if "argument" in d or "reply_to" in d:
            stance = _text(d.get("stance") or "Comment")
            argument = _text(d.get("argument") or d.get("reasoning") or "")
            return f"→ {_text(d.get('reply_to'))} ({stance}): {argument}"
        if "title" in d and "idea" in d:
            return f"{d.get('title')} · fit {d.get('hackathon_fit')}/10 — {_clip(d.get('idea'))}"
    return _clip(d)