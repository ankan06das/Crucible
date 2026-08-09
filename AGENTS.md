# Crucible

## Project Context

Greenfield hackathon MVP — **no code exists yet, and this is not a git repo.**

`notes/` is a symlink to an Obsidian vault at `/Users/ankandas/Obsidian/Papers/Crucible`. Editing files under `notes/` writes to the user's Obsidian vault.

Before making implementation decisions, read:

1. `notes/MVP Architecture.md` — Overall architecture and data flow.
2. `notes/Kanban.md` — Current sprint tasks.
3. `notes/Team Division.md` — Responsibilities.
4. `notes/Ideas.md` — Future features and design ideas.
5. `notes/Backend Structure.md` — Canonical folder layout and module ownership.

## Rules

- Follow the architecture in `MVP Architecture.md`.
- Do not implement backlog items unless requested.
- Prefer the backend-first approach.
- Keep APIs and schemas consistent with the architecture docs.

## Locked-in stack

- Python + **FastAPI** + Pydantic, **Supabase Postgres** for persistence (via psycopg async pool, `SUPABASE_DATABASE_URL`), agents run **in parallel** (asyncio). Next.js frontend is Phase 2 / post-MVP.
- Agent panel: Innovation, Feasibility, Impact, Technical, Skeptic. Every stage outputs structured JSON that feeds the next.
- API contract: `POST /idea`, `GET /idea/{id}`, `POST /idea/{id}/iterate`, `POST /idea/{id}/feedback`.

## Design invariants

- Independent analysis must never see other agents' reviews until the Debate phase (prevents groupthink).
- The Moderator only synthesizes the discussion; it must never invent new criticisms.
- Iteration rounds feed back prior debate history plus accepted/rejected suggestions.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
