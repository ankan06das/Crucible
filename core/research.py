from __future__ import annotations

import asyncio
import html as html_module
import re
from urllib.parse import quote_plus

import httpx

from llm import LLM
from schemas.generation import Fact, ResearchBrief

_TIMEOUT = httpx.Timeout(25.0)
_SNIPPET_LEN = 1600

_DISTILL_PROMPT = (
    "You are a factual research assistant. Below is raw material gathered about the topic: "
    "{topic}\n\nRaw material:\n{raw}\n\n"
    "Extract concrete, verifiable FACTS about the problem: statistics, mechanics, existing "
    "solutions, and market/user signals. Every fact must be traceable to the raw material - do "
    "NOT invent numbers or claims. For each fact set:\n"
    "- source: which URL or label (Wikipedia / web-search) it came from.\n"
    "- strength: 'high' if it is a concrete statistic or direct statement, 'medium' if it is a "
    "clear summary, 'low' if it is vague.\n"
    "Then list 2-4 'problem_signals' (observable problems the material suggests) and 2-4 "
    "'gap_notes' (what the material does NOT cover, or data that is unclear and would need "
    "validation).\n"
    "Return ONLY valid JSON."
)


def _clean_text(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html_module.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


async def _fetch_url(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        resp = await client.get(url)
        resp.raise_for_status()
    except Exception:
        return None
    return _clean_text(resp.text)[:_SNIPPET_LEN]


async def _wikipedia_summary(client: httpx.AsyncClient, topic: str) -> str | None:
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote_plus(topic)}"
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        title = data.get("title", topic)
        extract = data.get("extract", "")
        return f"Wikipedia - {title}: {extract}"[:_SNIPPET_LEN]
    except Exception:
        return None


async def _web_search(client: httpx.AsyncClient, topic: str) -> list[str]:
    try:
        resp = await client.get(
            "https://html.duckduckgo.com/html/",
            params={"q": f"{topic} problem statistics"},
        )
        resp.raise_for_status()
    except Exception:
        return []
    snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', resp.text, re.S)
    results = []
    for s in snippets:
        cleaned = _clean_text(re.sub(r"<[^>]+>", " ", s))
        if cleaned:
            results.append(cleaned)
    return results[:_SNIPPET_LEN]


async def research_topic(
    topic: str, urls: list[str] | None, llm: LLM, hint: str | None = None
) -> ResearchBrief:
    query_topic = f"{topic} {hint}" if hint else topic
    targets = urls or []
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        fetched = await asyncio.gather(
            *[_fetch_url(client, u) for u in targets], return_exceptions=True
        )
        url_texts = [t for t in fetched if isinstance(t, str) and t]
        wiki = await _wikipedia_summary(client, query_topic)
        web = await _web_search(client, query_topic)

    raw = url_texts + ([wiki] if wiki else []) + web
    if not raw:
        return ResearchBrief(
            facts=[],
            problem_signals=[],
            gap_notes=[
                f"No external sources were reachable for '{topic}'. The agent must reason from "
                "model knowledge and state which claims it cannot verify."
            ],
            sources=[],
        )

    prompt = _DISTILL_PROMPT.format(topic=query_topic, raw="\n• ".join(raw))
    brief = await llm.generate_json(prompt, ResearchBrief)

    labels = ["wikipedia"] if wiki else []
    if web:
        labels.append("web-search")
    brief.sources = targets + labels
    return brief


async def research_for_agent(
    idea_text: str, search_hint: str, llm: LLM
) -> ResearchBrief:
    """Run a scoped web research pass for a single judge agent."""
    query = f"{idea_text} {search_hint}".strip()
    return await research_topic(query, None, llm)