from __future__ import annotations

from typing import TYPE_CHECKING

from a2a.server.request_handlers import DefaultRequestHandlerV2
from a2a.server.routes import (
    add_a2a_routes_to_fastapi,
    create_agent_card_routes,
    create_jsonrpc_routes,
)
from a2a.server.tasks.inmemory_task_store import InMemoryTaskStore
from a2a.types.a2a_pb2 import (
    AgentCapabilities,
    AgentCard,
    AgentInterface,
    AgentSkill,
)

from agents.base import AgentSpec, CrucibleAgentExecutor
from agents.registry import AGENT_SPECS
from core.config import a2a_settings
from llm import LLM

if TYPE_CHECKING:
    from fastapi import FastAPI

_cards: dict[str, AgentCard] | None = None


def build_cards() -> dict[str, AgentCard]:
    global _cards
    if _cards is not None:
        return _cards
    _cards = {spec.name: _build_agent_card(spec) for spec in AGENT_SPECS}
    return _cards


def _build_agent_card(spec: AgentSpec) -> AgentCard:
    path = f"{a2a_settings.route_prefix}/{spec.name}"
    return AgentCard(
        name=spec.display_name,
        description=spec.description,
        version="1.0.0",
        capabilities=AgentCapabilities(streaming=False, push_notifications=False),
        skills=[
            AgentSkill(id=skill_id, name=skill_id, description=skill.description)
            for skill_id, skill in spec.skills.items()
        ],
        default_input_modes=["text"],
        default_output_modes=["text"],
        supported_interfaces=[
            AgentInterface(
                url=f"{a2a_settings.base_url}{path}",
                protocol_binding="JSONRPC",
                protocol_version="1.0",
            ),
            AgentInterface(
                url=f"{a2a_settings.base_url}{path}",
                protocol_binding="http+jsonrpc",
                protocol_version="1.0",
            ),
        ],
    )


def mount(app: "FastAPI", llm: LLM | None = None) -> dict[str, AgentCard]:
    if getattr(app.state, "a2a_mounted", False):
        return build_cards()

    llm = llm or LLM()
    cards = build_cards()
    for spec in AGENT_SPECS:
        card = cards[spec.name]
        path = f"{a2a_settings.route_prefix}/{spec.name}"
        handler = DefaultRequestHandlerV2(
            agent_executor=CrucibleAgentExecutor(llm, spec.skills),
            task_store=InMemoryTaskStore(),
            agent_card=card,
        )
        add_a2a_routes_to_fastapi(
            app,
            agent_card_routes=create_agent_card_routes(
                card, card_url=f"{path}/.well-known/agent-card.json"
            ),
            jsonrpc_routes=create_jsonrpc_routes(handler, rpc_url=path),
        )

    app.state.a2a_mounted = True
    return cards
