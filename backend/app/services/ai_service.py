"""
ai_service.py — PRISM AI Gateway

Gère la communication avec les LLM (Anthropic Claude, Mistral AI ou Ollama local).
Assemble le contexte complet : knowledge base + fichiers .prism/ + SIF active.
Stream les réponses via Server-Sent Events.

Providers supportés :
  - anthropic : Claude Sonnet/Opus/Haiku via Anthropic API
  - mistral   : Mistral Large/Small/Nemo via api.mistral.ai (souveraineté UE)
  - ollama    : Mistral, LLaMA, etc. via serveur Ollama local (configurable)
"""
from __future__ import annotations

import json
import logging
import os
from typing import AsyncGenerator, Literal

import httpx

from app.services.knowledge_service import get_knowledge_service

logger = logging.getLogger(__name__)

# ── Types ──────────────────────────────────────────────────────────────────────

Provider = Literal["anthropic", "mistral", "ollama"]

SUPPORTED_ANTHROPIC_MODELS = {
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "claude-opus-4-6": "claude-opus-4-6",
    "claude-haiku-4-5": "claude-haiku-4-5-20251001",
}

SUPPORTED_MISTRAL_MODELS = {
    "mistral-large-latest": "mistral-large-latest",      # Flagship — meilleure qualité
    "mistral-small-latest": "mistral-small-latest",      # Rapide, économique
    "mistral-nemo": "mistral-nemo",                      # Léger, Ollama-compatible
    "codestral-latest": "codestral-latest",              # Spécialisé code
}

DEFAULT_SYSTEM_PROMPT = (
    "Tu es PRISM AI, un assistant expert en sécurité fonctionnelle IEC 61511. "
    "Tu aides les ingénieurs à analyser les SIF (Safety Instrumented Functions), "
    "calculer les niveaux SIL, interpréter les résultats PFD, "
    "structurer les dossiers de preuve et appliquer correctement la norme. "
    "Tes réponses sont précises, concises et toujours fondées sur la norme IEC 61511. "
    "Si tu n'es pas certain, tu le dis clairement plutôt que d'inventer."
)


# ── Config ────────────────────────────────────────────────────────────────────

class AIConfig:
    """Configuration du service IA — lit les variables d'environnement."""

    provider: Provider            = os.getenv("AI_PROVIDER", "anthropic")        # type: ignore[assignment]
    anthropic_api_key: str        = os.getenv("ANTHROPIC_API_KEY", "")
    anthropic_model: str          = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    mistral_api_key: str          = os.getenv("MISTRAL_API_KEY", "")
    mistral_model: str            = os.getenv("MISTRAL_MODEL", "mistral-large-latest")
    ollama_host: str              = os.getenv("OLLAMA_HOST", "localhost")
    ollama_port: int              = int(os.getenv("OLLAMA_PORT", "11434"))
    ollama_model: str             = os.getenv("OLLAMA_MODEL", "mistral-nemo")
    ollama_timeout: int           = int(os.getenv("OLLAMA_TIMEOUT", "120"))
    max_context_chars: int        = int(os.getenv("AI_MAX_CONTEXT_CHARS", "40000"))

    @property
    def ollama_base_url(self) -> str:
        return f"http://{self.ollama_host}:{self.ollama_port}"

    @property
    def effective_anthropic_model(self) -> str:
        return SUPPORTED_ANTHROPIC_MODELS.get(
            self.anthropic_model, self.anthropic_model
        )

    @property
    def effective_mistral_model(self) -> str:
        return SUPPORTED_MISTRAL_MODELS.get(
            self.mistral_model, self.mistral_model
        )


# ── Modèles de données ────────────────────────────────────────────────────────

class ChatMessage:
    def __init__(self, role: str, content: str) -> None:
        self.role = role
        self.content = content

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}

    @classmethod
    def from_dict(cls, d: dict) -> "ChatMessage":
        return cls(role=d["role"], content=d["content"])


class AttachedContext:
    def __init__(self, sif_id: str, sif_name: str) -> None:
        self.sif_id = sif_id
        self.sif_name = sif_name


class PrismWorkspaceContext:
    """
    Contexte workspace complet — assemblé côté backend à partir :
      - des fichiers .prism/ du workspace
      - de la SIF active sérialisée
      - de l'ensemble des SIF (registry)
    """

    def __init__(
        self,
        context_md: str = "",          # .prism/context.md
        conventions_md: str = "",      # .prism/conventions.md
        standards_md: str = "",        # .prism/standards.md
        sif_registry_md: str = "",     # .prism/sif-registry.md (auto-généré)
        active_sif_json: dict | None = None,  # SIF active sérialisée
    ) -> None:
        self.context_md = context_md
        self.conventions_md = conventions_md
        self.standards_md = standards_md
        self.sif_registry_md = sif_registry_md
        self.active_sif_json = active_sif_json

    def to_markdown(self) -> str:
        """Sérialise le contexte workspace en Markdown pour injection dans le prompt."""
        parts: list[str] = []

        if self.context_md:
            parts.append(f"## Contexte projet\n\n{self.context_md}")

        if self.conventions_md:
            parts.append(f"## Conventions d'ingénierie\n\n{self.conventions_md}")

        if self.standards_md:
            parts.append(f"## Normes applicables\n\n{self.standards_md}")

        if self.sif_registry_md:
            parts.append(f"## Registre SIF du workspace\n\n{self.sif_registry_md}")

        if self.active_sif_json:
            sif_str = json.dumps(self.active_sif_json, ensure_ascii=False, indent=2)
            parts.append(
                f"## SIF active — données complètes\n\n"
                f"```json\n{sif_str}\n```"
            )

        if not parts:
            return ""

        header = "# Contexte workspace PRISM\n\n---\n\n"
        return header + "\n\n---\n\n".join(parts)


# ── Service principal ─────────────────────────────────────────────────────────

class AIService:
    """
    Gateway IA PRISM.

    Assemble le prompt complet et stream la réponse depuis
    Anthropic API ou un serveur Ollama local.
    """

    def __init__(self, config: AIConfig | None = None) -> None:
        self._cfg = config or AIConfig()
        self._knowledge = get_knowledge_service()

    # ── Assemblage du prompt ──────────────────────────────────────────────────

    def _build_system_prompt(
        self,
        workspace: PrismWorkspaceContext | None,
        last_user_message: str,
        custom_system_prompt: str = "",
    ) -> str:
        """
        Construit le system prompt complet en 3 couches :
          1. Rôle IA + system prompt custom
          2. Knowledge base (IEC 61511, méthodologie, guide PRISM)
          3. Contexte workspace (.prism/ + SIF active)
        """
        parts: list[str] = []

        # Couche 1 — Rôle IA
        base_prompt = custom_system_prompt.strip() if custom_system_prompt.strip() else DEFAULT_SYSTEM_PROMPT
        parts.append(base_prompt)

        # Couche 2 — Knowledge base (sélection intelligente selon la question)
        knowledge_ctx = self._knowledge.build_knowledge_context(
            query=last_user_message,
            max_chars=self._cfg.max_context_chars,
        )
        if knowledge_ctx:
            parts.append(knowledge_ctx)

        # Couche 3 — Contexte workspace
        if workspace:
            workspace_ctx = workspace.to_markdown()
            if workspace_ctx:
                parts.append(workspace_ctx)

        return "\n\n".join(parts)

    # ── Streaming Anthropic ───────────────────────────────────────────────────

    async def _stream_anthropic(
        self,
        system_prompt: str,
        messages: list[ChatMessage],
    ) -> AsyncGenerator[str, None]:
        """Stream via Anthropic Messages API."""
        if not self._cfg.anthropic_api_key:
            yield "❌ Clé API Anthropic non configurée. Renseigner `ANTHROPIC_API_KEY` dans les variables d'environnement."
            return

        headers = {
            "x-api-key": self._cfg.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        body = {
            "model": self._cfg.effective_anthropic_model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [m.to_dict() for m in messages],
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=body,
            ) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    logger.error("Anthropic API error %d: %s", resp.status_code, error_body)
                    yield f"❌ Erreur API Anthropic ({resp.status_code}). Vérifier la clé API et les quotas."
                    return

                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        event = json.loads(data_str)
                        if event.get("type") == "content_block_delta":
                            delta = event.get("delta", {})
                            if delta.get("type") == "text_delta":
                                yield delta.get("text", "")
                    except json.JSONDecodeError:
                        continue

    # ── Streaming Mistral AI ─────────────────────────────────────────────────

    async def _stream_mistral(
        self,
        system_prompt: str,
        messages: list[ChatMessage],
    ) -> AsyncGenerator[str, None]:
        """Stream via Mistral AI API (OpenAI-compatible chat completions)."""
        if not self._cfg.mistral_api_key:
            yield (
                "❌ Clé API Mistral non configurée. "
                "Renseigner `MISTRAL_API_KEY` dans les variables d'environnement. "
                "Obtenez une clé sur console.mistral.ai"
            )
            return

        headers = {
            "Authorization": f"Bearer {self._cfg.mistral_api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }

        # Mistral utilise le format OpenAI : system prompt = premier message role=system
        mistral_messages = [{"role": "system", "content": system_prompt}]
        mistral_messages.extend(m.to_dict() for m in messages)

        body = {
            "model": self._cfg.effective_mistral_model,
            "messages": mistral_messages,
            "stream": True,
            "max_tokens": 4096,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.mistral.ai/v1/chat/completions",
                    headers=headers,
                    json=body,
                ) as resp:
                    if resp.status_code != 200:
                        error_body = await resp.aread()
                        logger.error("Mistral API error %d: %s", resp.status_code, error_body)
                        yield f"❌ Erreur API Mistral ({resp.status_code}). Vérifier la clé API et les quotas."
                        return

                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            event = json.loads(data_str)
                            delta = event.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, IndexError):
                            continue

        except httpx.ConnectError:
            yield "❌ Impossible de contacter l'API Mistral. Vérifier la connexion réseau."
        except httpx.TimeoutException:
            yield "⏱ Timeout Mistral AI. Réessayer ou utiliser un modèle plus léger."

    # ── Streaming Ollama ──────────────────────────────────────────────────────

    async def _stream_ollama(
        self,
        system_prompt: str,
        messages: list[ChatMessage],
    ) -> AsyncGenerator[str, None]:
        """Stream via API Ollama /api/chat."""
        url = f"{self._cfg.ollama_base_url}/api/chat"

        # Ollama attend le system prompt comme premier message system
        ollama_messages = [{"role": "system", "content": system_prompt}]
        ollama_messages.extend(m.to_dict() for m in messages)

        body = {
            "model": self._cfg.ollama_model,
            "messages": ollama_messages,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self._cfg.ollama_timeout)
            ) as client:
                async with client.stream("POST", url, json=body) as resp:
                    if resp.status_code != 200:
                        error_body = await resp.aread()
                        logger.error("Ollama error %d: %s", resp.status_code, error_body)
                        yield (
                            f"❌ Erreur Ollama ({resp.status_code}). "
                            f"Vérifier que le serveur tourne sur {self._cfg.ollama_base_url} "
                            f"et que le modèle '{self._cfg.ollama_model}' est disponible."
                        )
                        return

                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            event = json.loads(line)
                            content = event.get("message", {}).get("content", "")
                            if content:
                                yield content
                            if event.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue

        except httpx.ConnectError:
            yield (
                f"❌ Impossible de contacter Ollama sur {self._cfg.ollama_base_url}. "
                "Vérifier que le serveur Ollama est démarré (`ollama serve`) "
                "et que le host/port sont corrects dans les paramètres."
            )
        except httpx.TimeoutException:
            yield (
                f"⏱ Timeout Ollama après {self._cfg.ollama_timeout}s. "
                "Le modèle met trop de temps à répondre — "
                "essayer un modèle plus léger ou augmenter le timeout."
            )

    # ── Point d'entrée principal ──────────────────────────────────────────────

    async def stream_response(
        self,
        messages: list[ChatMessage],
        workspace: PrismWorkspaceContext | None = None,
        custom_system_prompt: str = "",
        provider_override: Provider | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream une réponse IA complète avec contexte assemblé.

        Args:
            messages: Historique de la conversation (rôle user/assistant).
            workspace: Contexte workspace (.prism/ + SIF active).
            custom_system_prompt: System prompt personnalisé (depuis config chat).
            provider_override: Forcer un provider (ignore la config globale).
        """
        provider = provider_override or self._cfg.provider
        last_user_message = next(
            (m.content for m in reversed(messages) if m.role == "user"), ""
        )

        system_prompt = self._build_system_prompt(
            workspace=workspace,
            last_user_message=last_user_message,
            custom_system_prompt=custom_system_prompt,
        )

        logger.debug(
            "AI stream | provider=%s | messages=%d | system_prompt=%d chars",
            provider, len(messages), len(system_prompt),
        )

        if provider == "anthropic":
            async for chunk in self._stream_anthropic(system_prompt, messages):
                yield chunk
        elif provider == "mistral":
            async for chunk in self._stream_mistral(system_prompt, messages):
                yield chunk
        elif provider == "ollama":
            async for chunk in self._stream_ollama(system_prompt, messages):
                yield chunk
        else:
            yield f"❌ Provider inconnu : '{provider}'. Valeurs acceptées : 'anthropic', 'mistral', 'ollama'."

    # ── Health check ──────────────────────────────────────────────────────────

    async def health_check(self) -> dict:
        """Vérifie la disponibilité du provider configuré."""
        result: dict = {
            "provider": self._cfg.provider,
            "knowledge_base": self._knowledge.status(),
        }

        if self._cfg.provider == "anthropic":
            result["anthropic_key_set"] = bool(self._cfg.anthropic_api_key)
            result["anthropic_model"] = self._cfg.effective_anthropic_model

        elif self._cfg.provider == "mistral":
            result["mistral_key_set"] = bool(self._cfg.mistral_api_key)
            result["mistral_model"] = self._cfg.effective_mistral_model
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(
                        "https://api.mistral.ai/v1/models",
                        headers={"Authorization": f"Bearer {self._cfg.mistral_api_key}"},
                    )
                    result["mistral_reachable"] = resp.status_code == 200
                    if resp.status_code == 200:
                        models = [m["id"] for m in resp.json().get("data", [])]
                        result["mistral_available_models"] = models
            except Exception as e:
                result["mistral_reachable"] = False
                result["mistral_error"] = str(e)

        elif self._cfg.provider == "ollama":
            result["ollama_url"] = self._cfg.ollama_base_url
            result["ollama_model"] = self._cfg.ollama_model
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{self._cfg.ollama_base_url}/api/tags")
                    result["ollama_reachable"] = resp.status_code == 200
                    if resp.status_code == 200:
                        models = [m["name"] for m in resp.json().get("models", [])]
                        result["ollama_available_models"] = models
                        result["ollama_model_installed"] = any(
                            self._cfg.ollama_model in m for m in models
                        )
            except Exception as e:
                result["ollama_reachable"] = False
                result["ollama_error"] = str(e)

        return result


# ── Singleton ─────────────────────────────────────────────────────────────────
_instance: AIService | None = None


def get_ai_service() -> AIService:
    global _instance
    if _instance is None:
        _instance = AIService()
    return _instance
