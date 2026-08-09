from __future__ import annotations

import json
from typing import TYPE_CHECKING
from uuid import uuid4

import httpx
from a2a.client import ClientConfig, create_client
from a2a.types.a2a_pb2 import AgentCard, Message, Part, Role, SendMessageRequest
from google.protobuf import json_format
from google.protobuf.struct_pb2 import Value
from pydantic import BaseModel

if TYPE_CHECKING:
    from fastapi import FastAPI

_TIMEOUT = httpx.Timeout(300.0)


class A2APanelClient:
    """A2A client that drives the in-process judge panel over ASGI.

    The A2A protocol is exercised end-to-end (JSON-RPC over HTTP) even
    though the agents live in the same FastAPI app.
    """

    def __init__(self, app: FastAPI, cards: dict[str, AgentCard]):
        self.cards = cards
        self._httpx = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), timeout=_TIMEOUT
        )

    async def close(self) -> None:
        await self._httpx.aclose()

    @staticmethod
    def _request_message(prompt: str, skill: str) -> Message:
        skill_part = Part(
            data=json_format.Parse(json.dumps({"skill": skill}), Value())
        )
        return Message(
            message_id=uuid4().hex,
            role=Role.ROLE_USER,
            parts=[Part(text=prompt), skill_part],
        )

    async def ask(
        self, agent: str, prompt: str, skill: str, schema: type[BaseModel]
    ) -> BaseModel:
        card = self.cards[agent]
        config = ClientConfig(streaming=False, httpx_client=self._httpx)
        client = await create_client(card, config)
        request = SendMessageRequest(message=self._request_message(prompt, skill))

        async for response in client.send_message(request):
            if response.HasField("message"):
                msg = response.message
                for part in msg.parts:
                    if part.HasField("data"):
                        dict_data = json_format.MessageToDict(part.data)
                        try:
                            if "structValue" in dict_data:
                                json_str = dict_data["structValue"]["fields"]["data"]["stringValue"]
                            elif "stringValue" in dict_data:
                                json_str = dict_data["stringValue"]
                            else:
                                json_str = json.dumps(dict_data)
                            
                            return schema.model_validate_json(json_str)
                        except Exception as e:
                            print(f"[ERROR] Invalid JSON or missing key. dict_data: {dict_data}, error: {e}")
                            try:
                                # Attempt more lenient parsing
                                cleaned = json_str.replace('\\n', ' ').replace('\\r', '').replace('\\', '')
                                return schema.model_validate(json.loads(cleaned, strict=False))
                            except Exception:
                                # Return an empty model as fallback
                                try:
                                    # If it expects a root list (like DebateRound)
                                    return schema(root=[])
                                except Exception:
                                    # Standard BaseModel fallback
                                    return schema.model_construct()
        
        # If we reach here without returning, return a fallback model
        try:
            return schema(root=[])
        except Exception:
            return schema.model_construct()

            if response.HasField("task"):
                raise NotImplementedError(
                    f"{agent} responded in task mode, which is not handled yet"
                )
        raise RuntimeError(f"{agent} produced no response")
