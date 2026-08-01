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

- Python + **FastAPI** + Pydantic, **SQLite** for persistence, agents run **in parallel** (asyncio). Next.js frontend is Phase 2 / post-MVP.
- Agent panel: Innovation, Feasibility, Impact, Technical, Skeptic. Every stage outputs structured JSON that feeds the next.
- API contract: `POST /idea`, `GET /idea/{id}`, `POST /idea/{id}/iterate`, `POST /idea/{id}/feedback`.

## Design invariants

- Independent analysis must never see other agents' reviews until the Debate phase (prevents groupthink).
- The Moderator only synthesizes the discussion; it must never invent new criticisms.
- Iteration rounds feed back prior debate history plus accepted/rejected suggestions.