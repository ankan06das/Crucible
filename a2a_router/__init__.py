from __future__ import annotations

from importlib import import_module
from typing import Any

__all__ = ["A2APanelClient", "build_cards", "mount"]


def __getattr__(name: str) -> Any:
    if name == "A2APanelClient":
        return import_module("a2a_router.client").A2APanelClient
    if name in {"build_cards", "mount"}:
        module = import_module("a2a_router.server")
        return getattr(module, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
