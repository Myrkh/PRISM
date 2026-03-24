"""
routes/ai.py — PRISM AI Endpoints

POST /api/ai/chat       → Stream une réponse IA (SSE)
GET  /api/ai/health     → État du service IA et de la knowledge base
GET  /api/ai/models     → Modèles disponibles selon le provider configuré
"""
from __future__ import annotations

import json
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.ai_service import (
    AIService,
    AttachedContext,
    ChatMessage,
    PrismWorkspaceContext,
    Provider,
    get_ai_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class ChatMessageSchema(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class WorkspaceContextSchema(BaseModel):
    """Contexte workspace envoyé par le front — fichiers .prism/ + SIF active."""
    context_md: str = Field(default="", description=".prism/context.md content")
    conventions_md: str = Field(default="", description=".prism/conventions.md content")
    standards_md: str = Field(default="", description=".prism/standards.md content")
    sif_registry_md: str = Field(default="", description=".prism/sif-registry.md content (auto-generated)")
    active_sif_json: dict | None = Field(default=None, description="Active SIF full serialization")


class ChatRequest(BaseModel):
    messages: list[ChatMessageSchema] = Field(..., description="Conversation history")
    workspace: WorkspaceContextSchema | None = Field(default=None)
    custom_system_prompt: str = Field(default="", description="User-defined system prompt from chat config")
    provider: Literal["anthropic", "mistral", "ollama"] | None = Field(
        default=None,
        description="Provider override (default: use server config)"
    )
    model: str | None = Field(
        default=None,
        description="Model override (e.g. 'claude-sonnet-4-6', 'mistral-nemo')"
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """
    Stream une réponse IA via Server-Sent Events.

    Le front consomme ce stream avec fetch + ReadableStream.
    Chaque chunk SSE : `data: <text>\\n\\n`
    Fin du stream    : `data: [DONE]\\n\\n`
    """
    service = get_ai_service()

    # Appliquer les overrides model si spécifié
    if request.model:
        effective = request.provider or service._cfg.provider
        if effective == "anthropic":
            service._cfg.anthropic_model = request.model
        elif effective == "mistral":
            service._cfg.mistral_model = request.model
        elif effective == "ollama":
            service._cfg.ollama_model = request.model

    # Mapper les schémas Pydantic → modèles internes
    messages = [ChatMessage(role=m.role, content=m.content) for m in request.messages]

    workspace: PrismWorkspaceContext | None = None
    if request.workspace:
        workspace = PrismWorkspaceContext(
            context_md=request.workspace.context_md,
            conventions_md=request.workspace.conventions_md,
            standards_md=request.workspace.standards_md,
            sif_registry_md=request.workspace.sif_registry_md,
            active_sif_json=request.workspace.active_sif_json,
        )

    async def event_generator():
        try:
            async for chunk in service.stream_response(
                messages=messages,
                workspace=workspace,
                custom_system_prompt=request.custom_system_prompt,
                provider_override=request.provider,
            ):
                if chunk:
                    # Échapper les newlines pour SSE
                    escaped = chunk.replace("\n", "\\n")
                    yield f"data: {json.dumps(escaped)}\n\n"
        except Exception as exc:
            logger.exception("AI stream error: %s", exc)
            error_msg = f"❌ Erreur serveur : {exc!s}"
            yield f"data: {json.dumps(error_msg)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Désactiver le buffering nginx
        },
    )


@router.get("/health")
async def ai_health() -> dict:
    """État du service IA, knowledge base et connectivité provider."""
    service = get_ai_service()
    return await service.health_check()


@router.get("/models")
async def available_models() -> dict:
    """
    Retourne les modèles disponibles.
    Pour Ollama : interroge le serveur local.
    Pour Anthropic : retourne la liste statique.
    """
    service = get_ai_service()
    cfg = service._cfg

    if cfg.provider == "anthropic":
        return {
            "provider": "anthropic",
            "models": [
                {"id": "claude-sonnet-4-6", "label": "Claude Sonnet 4.6", "recommended": True},
                {"id": "claude-opus-4-6",   "label": "Claude Opus 4.6",   "recommended": False},
                {"id": "claude-haiku-4-5",  "label": "Claude Haiku 4.5",  "recommended": False},
            ],
            "current": cfg.anthropic_model,
        }

    elif cfg.provider == "mistral":
        return {
            "provider": "mistral",
            "models": [
                {"id": "mistral-large-latest", "label": "Mistral Large",   "recommended": True},
                {"id": "mistral-small-latest", "label": "Mistral Small",   "recommended": False},
                {"id": "mistral-nemo",         "label": "Mistral Nemo",    "recommended": False},
                {"id": "codestral-latest",     "label": "Codestral",       "recommended": False},
            ],
            "current": cfg.mistral_model,
        }

    elif cfg.provider == "ollama":
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{cfg.ollama_base_url}/api/tags")
                if resp.status_code == 200:
                    raw_models = resp.json().get("models", [])
                    return {
                        "provider": "ollama",
                        "ollama_url": cfg.ollama_base_url,
                        "models": [
                            {
                                "id": m["name"],
                                "label": m["name"],
                                "size_bytes": m.get("size", 0),
                            }
                            for m in raw_models
                        ],
                        "current": cfg.ollama_model,
                    }
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"Ollama non accessible sur {cfg.ollama_base_url}: {e}",
            ) from e

    return {"provider": cfg.provider, "models": [], "error": "Provider inconnu"}
