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
ResponseMode = Literal["default", "draft_note", "create_project", "create_sif", "draft_sif", "create_library"]

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


class WorkspaceAttachment:
    def __init__(
        self,
        kind: Literal["note", "pdf", "image", "json"],
        node_id: str,
        name: str,
        content: str = "",
        url: str = "",
    ) -> None:
        self.kind = kind
        self.node_id = node_id
        self.name = name
        self.content = content
        self.url = url


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
        target_project_json: dict | None = None,  # Projet ciblé pour create_sif / draft_sif
    ) -> None:
        self.context_md = context_md
        self.conventions_md = conventions_md
        self.standards_md = standards_md
        self.sif_registry_md = sif_registry_md
        self.active_sif_json = active_sif_json
        self.target_project_json = target_project_json

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

        if self.target_project_json:
            project_str = json.dumps(self.target_project_json, ensure_ascii=False, indent=2)
            parts.append(
                f"## Projet cible — métadonnées\n\n"
                f"```json\n{project_str}\n```"
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

    def _truncate_attachment_text(self, text: str, limit: int = 12000) -> str:
        if len(text) <= limit:
            return text
        return text[: limit - 18].rstrip() + "\n\n[contenu tronqué]"

    async def _extract_document_markdown(self, attachment: WorkspaceAttachment) -> str | None:
        if not attachment.url or not self._cfg.mistral_api_key:
            return None

        document_type = "image_url" if attachment.kind == "image" else "document_url"
        payload = {
            "model": "mistral-ocr-latest",
            "document": {
                "type": document_type,
                document_type: attachment.url,
            },
        }
        headers = {
            "Authorization": f"Bearer {self._cfg.mistral_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post("https://api.mistral.ai/v1/ocr", headers=headers, json=payload)
                if resp.status_code != 200:
                    logger.warning("Mistral OCR error %d for %s", resp.status_code, attachment.name)
                    return None
                data = resp.json()
        except Exception as exc:
            logger.warning("Mistral OCR failed for %s: %s", attachment.name, exc)
            return None

        pages = data.get("pages", [])
        markdown_parts = [page.get("markdown", "").strip() for page in pages if page.get("markdown")]
        if not markdown_parts:
            return None
        return self._truncate_attachment_text("\n\n---\n\n".join(markdown_parts))

    async def _prepare_attachments(
        self,
        attachments: list[WorkspaceAttachment] | None,
    ) -> list[WorkspaceAttachment]:
        prepared: list[WorkspaceAttachment] = []
        for attachment in attachments or []:
            current = WorkspaceAttachment(
                kind=attachment.kind,
                node_id=attachment.node_id,
                name=attachment.name,
                content=attachment.content,
                url=attachment.url,
            )
            if current.kind in {"pdf", "image"} and current.url and not current.content:
                extracted = await self._extract_document_markdown(current)
                if extracted:
                    current.content = extracted
            prepared.append(current)
        return prepared

    def _build_mistral_messages(
        self,
        system_prompt: str,
        messages: list[ChatMessage],
        attachments: list[WorkspaceAttachment] | None,
    ) -> list[dict]:
        mistral_messages: list[dict] = [{"role": "system", "content": system_prompt}]
        image_urls = [attachment.url for attachment in attachments or [] if attachment.kind == "image" and attachment.url]
        last_user_index = next((index for index in range(len(messages) - 1, -1, -1) if messages[index].role == "user"), None)

        for index, message in enumerate(messages):
            if last_user_index is not None and index == last_user_index and image_urls:
                content = [{"type": "text", "text": message.content}]
                for image_url in image_urls[:4]:
                    content.append({"type": "image_url", "image_url": image_url})
                mistral_messages.append({"role": message.role, "content": content})
            else:
                mistral_messages.append(message.to_dict())

        return mistral_messages

    # ── Assemblage du prompt ──────────────────────────────────────────────────

    def _build_system_prompt(
        self,
        workspace: PrismWorkspaceContext | None,
        attached_context: AttachedContext | None,
        attachments: list[WorkspaceAttachment] | None,
        last_user_message: str,
        custom_system_prompt: str = "",
        strict_mode: bool = False,
        response_mode: ResponseMode = "default",
    ) -> str:
        """
        Construit le system prompt complet en 5 couches :
          1. Rôle IA + system prompt custom
          2. Knowledge base (IEC 61511, méthodologie, guide PRISM)
          3. SIF explicitement jointe par l'utilisateur
          4. Fichiers du workspace joints explicitement
          5. Contexte workspace (.prism/ + SIF active)
        """
        parts: list[str] = []

        base_prompt = custom_system_prompt.strip() if custom_system_prompt.strip() else DEFAULT_SYSTEM_PROMPT
        parts.append(base_prompt)

        if strict_mode:
            parts.append(
                "## Mode strict PRISM\n\n"
                "- Réponds de manière sobre, structurée et prudente.\n"
                "- N'invente jamais une donnée absente du contexte.\n"
                "- Signale explicitement les hypothèses et les données manquantes.\n"
                "- Si une conclusion IEC 61511 est incertaine, dis-le clairement au lieu de surconclure."
            )

        if response_mode == "draft_note":
            parts.append(
                "## Mode draft_note\n\n"
                "- Retourne uniquement le contenu final de la note en Markdown.\n"
                "- N'ajoute aucune introduction ni conclusion conversationnelle.\n"
                "- N'écris jamais des phrases comme \"Voici une note\", \"Vous pouvez la copier\" ou \"Besoin d'un exemple\".\n"
                "- N'entoure pas la note complète avec des triple backticks.\n"
                "- Commence directement par le titre ou le premier paragraphe utile de la note.\n"
                "- Utilise du vrai Markdown: titres avec #, listes Markdown, tableaux Markdown si utile.\n"
                "- Si tu ajoutes un schéma ASCII ou un extrait de code, garde-le à l'intérieur de la note sans remplacer le reste du contenu."
            )

        if response_mode == "create_project":
            parts.append(
                "## Mode structured_project_draft\n\n"
                "- Retourne uniquement un objet JSON valide. Aucun Markdown, aucune phrase hors JSON.\n"
                "- Utilise d'abord le contexte .prism fourni, puis les pièces jointes éventuelles.\n"
                "- Réutilise strictement le contrat .prism projet attendu par PRISM.\n"
                "- N'invente jamais une donnée absente du contexte. Si l'information manque, laisse une chaîne vide quand le contrat l'autorise et documente-la dans missing_data ou uncertain_data.\n"
                "- N'ajoute pas de SIF au projet si le contexte ne permet pas d'en proposer une de manière crédible. Dans ce cas, renvoie payload.sifs = [].\n"
                "- Si le contexte .prism est insuffisant ou contradictoire, remonte l'écart dans uncertain_data ou conflicts au lieu de fabriquer une valeur.\n"
                "- Le JSON doit respecter exactement ce schéma:\n"
                "{\n"
                "  \"kind\": \"project_draft\",\n"
                "  \"summary\": \"...\",\n"
                "  \"assumptions\": [\"...\"],\n"
                "  \"missing_data\": [\"...\"],\n"
                "  \"uncertain_data\": [\"...\"],\n"
                "  \"conflicts\": [\"...\"],\n"
                "  \"prism_file\": {\n"
                "    \"prismVersion\": \"1.0\",\n"
                "    \"type\": \"project\",\n"
                "    \"exportedAt\": \"2026-03-27T12:00:00Z\",\n"
                "    \"payload\": {\n"
                "      \"projectMeta\": {\n"
                "        \"name\": \"...\",\n"
                "        \"ref\": \"...\",\n"
                "        \"client\": \"...\",\n"
                "        \"site\": \"...\",\n"
                "        \"unit\": \"...\",\n"
                "        \"standard\": \"IEC61511|IEC61508|ISA84\",\n"
                "        \"revision\": \"A\",\n"
                "        \"description\": \"...\",\n"
                "        \"status\": \"active|completed|archived\"\n"
                "      },\n"
                "      \"sifs\": []\n"
                "    }\n"
                "  }\n"
                "}\n"
                "- Le nom du projet est obligatoire.\n"
                "- standard doit valoir IEC61511, IEC61508 ou ISA84.\n"
                "- status doit valoir active, completed ou archived.\n"
                "- La sortie doit être directement parsable par un JSON.parse."
            )

        if response_mode == "create_library":
            parts.append(
                "## Mode structured_library_draft\n\n"
                "- Retourne uniquement un objet JSON valide. Aucun Markdown, aucune phrase hors JSON.\n"
                "- Utilise d'abord le contexte .prism fourni, puis les pièces jointes éventuelles, puis le projet cible s'il est explicitement fourni.\n"
                "- Réutilise strictement le contrat d'export/import Library PRISM attendu par l'application: prism.component-templates.\n"
                "- Retourne exactement un template dans library_file.templates.\n"
                "- N'invente jamais une donnée absente du contexte. Si une information manque, utilise une chaîne vide pour le texte, 0 pour les champs numériques, false pour les booléens, puis documente explicitement le manque dans missing_data ou uncertain_data.\n"
                "- N'utilise jamais de valeurs typiques, conservatrices, par défaut ou d'exemple pour remplir manufacturer, data_source, lambdas, DC, test intervals, proof_test_coverage ou lifetime.\n"
                "- Si un projet cible explicite est fourni par PRISM, target_scope doit valoir project. Sinon target_scope doit valoir user.\n"
                "- Si field_status d'un champ vaut missing, uncertain ou conflict, la valeur correspondante dans library_file doit rester vide, nulle, false ou 0 selon son type.\n"
                "- Le JSON doit respecter exactement ce schéma:\n"
                "{\n"
                "  \"kind\": \"library_draft\",\n"
                "  \"summary\": \"...\",\n"
                "  \"target_scope\": \"user|project\",\n"
                "  \"assumptions\": [\"...\"],\n"
                "  \"missing_data\": [\"...\"],\n"
                "  \"uncertain_data\": [\"...\"],\n"
                "  \"conflicts\": [\"...\"],\n"
                "  \"field_status\": {\n"
                "    \"template_name\": \"provided|missing|uncertain|conflict\",\n"
                "    \"template_scope\": \"provided|missing|uncertain|conflict\",\n"
                "    \"target_project\": \"provided|missing|uncertain|conflict\",\n"
                "    \"library_name\": \"provided|missing|uncertain|conflict\",\n"
                "    \"review_status\": \"provided|missing|uncertain|conflict\",\n"
                "    \"source_reference\": \"provided|missing|uncertain|conflict\",\n"
                "    \"tags\": \"provided|missing|uncertain|conflict\",\n"
                "    \"subsystem_type\": \"provided|missing|uncertain|conflict\",\n"
                "    \"instrument_category\": \"provided|missing|uncertain|conflict\",\n"
                "    \"instrument_type\": \"provided|missing|uncertain|conflict\",\n"
                "    \"manufacturer\": \"provided|missing|uncertain|conflict\",\n"
                "    \"data_source\": \"provided|missing|uncertain|conflict\",\n"
                "    \"determined_character\": \"provided|missing|uncertain|conflict\",\n"
                "    \"component_description\": \"provided|missing|uncertain|conflict\",\n"
                "    \"factorized_lambda\": \"provided|missing|uncertain|conflict\",\n"
                "    \"factorized_lambda_d_ratio\": \"provided|missing|uncertain|conflict\",\n"
                "    \"factorized_dcd\": \"provided|missing|uncertain|conflict\",\n"
                "    \"factorized_dcs\": \"provided|missing|uncertain|conflict\",\n"
                "    \"lambda_du\": \"provided|missing|uncertain|conflict\",\n"
                "    \"lambda_dd\": \"provided|missing|uncertain|conflict\",\n"
                "    \"lambda_su\": \"provided|missing|uncertain|conflict\",\n"
                "    \"lambda_sd\": \"provided|missing|uncertain|conflict\",\n"
                "    \"test_t1\": \"provided|missing|uncertain|conflict\",\n"
                "    \"test_t0\": \"provided|missing|uncertain|conflict\",\n"
                "    \"test_type\": \"provided|missing|uncertain|conflict\",\n"
                "    \"proof_test_coverage\": \"provided|missing|uncertain|conflict\",\n"
                "    \"lifetime\": \"provided|missing|uncertain|conflict\"\n"
                "  },\n"
                "  \"library_file\": {\n"
                "    \"format\": \"prism.component-templates\",\n"
                "    \"version\": 1,\n"
                "    \"exportedAt\": \"2026-03-27T12:00:00Z\",\n"
                "    \"exportedByProfileId\": null,\n"
                "    \"projectId\": null,\n"
                "    \"libraryName\": \"...\",\n"
                "    \"templates\": [\n"
                "      {\n"
                "        \"name\": \"...\",\n"
                "        \"description\": \"...\",\n"
                "        \"subsystemType\": \"sensor|logic|actuator\",\n"
                "        \"sourceReference\": \"...\",\n"
                "        \"tags\": [\"...\"],\n"
                "        \"reviewStatus\": \"draft|review|approved\",\n"
                "        \"libraryName\": \"...\",\n"
                "        \"componentSnapshot\": {\n"
                "          \"subsystemType\": \"sensor|logic|actuator\",\n"
                "          \"instrumentCategory\": \"...\",\n"
                "          \"instrumentType\": \"...\",\n"
                "          \"manufacturer\": \"...\",\n"
                "          \"dataSource\": \"...\",\n"
                "          \"determinedCharacter\": \"TYPE_A|TYPE_B|NON_TYPE_AB\",\n"
                "          \"description\": \"...\",\n"
                "          \"paramMode\": \"factorized|developed\",\n"
                "          \"factorized\": { \"lambda\": 0, \"lambdaDRatio\": 0, \"DCd\": 0, \"DCs\": 0 },\n"
                "          \"developed\": { \"lambda_DU\": 0, \"lambda_DD\": 0, \"lambda_SU\": 0, \"lambda_SD\": 0 },\n"
                "          \"test\": { \"T1\": 0, \"T0\": 0, \"testType\": \"none\" },\n"
                "          \"advanced\": { \"proofTestCoverage\": 0, \"lifetime\": 0 }\n"
                "        }\n"
                "      }\n"
                "    ]\n"
                "  }\n"
                "}\n"
                "- Le champ summary est obligatoire.\n"
                "- subsystemType et componentSnapshot.subsystemType doivent toujours être cohérents.\n"
                "- La sortie doit être directement parsable par un JSON.parse."
            )

        if response_mode in {"create_sif", "draft_sif"}:
            parts.append(
                "## Mode structured_sif_draft\n\n"
                "- Retourne uniquement un objet JSON valide. Aucun Markdown, aucune phrase hors JSON.\n"
                "- Utilise d'abord le contexte .prism fourni, puis les pièces jointes éventuelles, puis le projet cible.\n"
                "- N'invente jamais une donnée absente du contexte. Si l'information manque, laisse le champ vide et documente-le dans missing_data ou uncertain_data.\n"
                "- N'utilise jamais de valeur typique, conservative, par défaut, d'exemple ou de bonne pratique pour remplir un champ.\n"
                "- N'utilise jamais des exemples de composants, des lambda, des DC, des beta, des PFD, des SFF, des PST, des temps de réponse, des demand rates, des proof test intervals ou des SIL cibles s'ils ne sont pas explicitement présents dans le contexte.\n"
                "- Un SIL maximum autorisé ne définit pas à lui seul le SIL cible. Si seul un SIL max est connu, cible -> uncertain_data, pas target_sil.\n"
                "- Un préfixe de tag (ex: R201-) ne définit pas à lui seul un process_tag complet.\n"
                "- Ne propage jamais automatiquement la même architecture à sensor, logic et actuator. Raisonne chaque sous-système séparément.\n"
                "- Si le contexte .prism contredit le projet cible, ajoute l'écart dans conflicts et n'affirme pas une version comme certaine.\n"
                "- Le JSON doit respecter exactement ce schéma:\n"
                "{\n"
                "  \"kind\": \"sif_draft\",\n"
                "  \"summary\": \"...\",\n"
                "  \"assumptions\": [\"...\"],\n"
                "  \"missing_data\": [\"...\"],\n"
                "  \"uncertain_data\": [\"...\"],\n"
                "  \"conflicts\": [\"...\"],\n"
                "  \"field_status\": {\n"
                "    \"process_tag\": \"provided|missing|uncertain|conflict\",\n"
                "    \"target_sil\": \"provided|missing|uncertain|conflict\",\n"
                "    \"demand_rate\": \"provided|missing|uncertain|conflict\",\n"
                "    \"rrf_required\": \"provided|missing|uncertain|conflict\",\n"
                "    \"process_safety_time\": \"provided|missing|uncertain|conflict\",\n"
                "    \"sif_response_time\": \"provided|missing|uncertain|conflict\",\n"
                "    \"safe_state\": \"provided|missing|uncertain|conflict\",\n"
                "    \"sensor_architecture\": \"provided|missing|uncertain|conflict\",\n"
                "    \"logic_architecture\": \"provided|missing|uncertain|conflict\",\n"
                "    \"actuator_architecture\": \"provided|missing|uncertain|conflict\"\n"
                "  },\n"
                "  \"sif_draft\": {\n"
                "    \"sif_number\": \"SIF-...\",\n"
                "    \"title\": \"...\",\n"
                "    \"description\": \"...\",\n"
                "    \"pid\": \"...\",\n"
                "    \"location\": \"...\",\n"
                "    \"process_tag\": \"...\",\n"
                "    \"hazardous_event\": \"...\",\n"
                "    \"demand_rate\": 0.1,\n"
                "    \"target_sil\": 2,\n"
                "    \"rrf_required\": 100,\n"
                "    \"made_by\": \"...\",\n"
                "    \"verified_by\": \"...\",\n"
                "    \"approved_by\": \"...\",\n"
                "    \"date\": \"YYYY-MM-DD\",\n"
                "    \"process_safety_time\": 30,\n"
                "    \"sif_response_time\": 10,\n"
                "    \"safe_state\": \"...\",\n"
                "    \"status\": \"draft\",\n"
                "    \"subsystem_architecture\": {\n"
                "      \"sensor\": \"1oo2\",\n"
                "      \"logic\": \"1oo1\",\n"
                "      \"actuator\": \"1oo1\"\n"
                "    }\n"
                "  }\n"
                "}\n"
                "- Les valeurs autorisées pour subsystem_architecture.sensor|logic|actuator sont: 1oo1, 1oo2, 2oo2, 2oo3, 1oo2D, custom.\n"
                "- Les valeurs autorisées pour target_sil sont: 1, 2, 3, 4.\n"
                "- Le champ summary est obligatoire. Le champ title est fortement recommandé.\n"
                "- Si field_status d'un champ critique vaut missing, uncertain ou conflict, n'écris aucune valeur pour ce champ dans sif_draft.\n"
                "- Si field_status vaut provided, la valeur correspondante doit être présente dans sif_draft.\n"
                "- La sortie doit être directement parsable par un JSON.parse."
            )

        knowledge_ctx = self._knowledge.build_knowledge_context(
            query=last_user_message,
            max_chars=self._cfg.max_context_chars,
        )
        if knowledge_ctx:
            parts.append(knowledge_ctx)

        if attached_context:
            attached_name = attached_context.sif_name.strip() or "Sans titre"
            parts.append(
                "## SIF jointe explicitement par l'utilisateur\n\n"
                f"- Nom : {attached_name}\n"
                f"- ID : {attached_context.sif_id}\n"
                "- Utilise cette SIF comme contexte prioritaire si la question est ambiguë."
            )

        if attachments:
            attachment_sections: list[str] = []
            for attachment in attachments:
                title = f"### {attachment.name} ({attachment.kind.upper()})"
                if attachment.content.strip():
                    attachment_sections.append(f"{title}\n\n{attachment.content.strip()}")
                else:
                    attachment_sections.append(
                        f"{title}\n\n"
                        "- Fichier joint sans contenu extrait par le backend.\n"
                        "- Si le modèle supporte la vision/document AI, il peut encore l'exploiter selon le provider."
                    )
            if attachment_sections:
                parts.append(
                    "## Fichiers du workspace joints explicitement\n\n"
                    + "\n\n---\n\n".join(attachment_sections)
                )

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
        attachments: list[WorkspaceAttachment] | None = None,
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

        mistral_messages = self._build_mistral_messages(system_prompt, messages, attachments)

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
        attached_context: AttachedContext | None = None,
        workspace: PrismWorkspaceContext | None = None,
        attachments: list[WorkspaceAttachment] | None = None,
        custom_system_prompt: str = "",
        strict_mode: bool = False,
        response_mode: ResponseMode = "default",
        provider_override: Provider | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream une réponse IA complète avec contexte assemblé.

        Args:
            messages: Historique de la conversation (rôle user/assistant).
            attached_context: SIF explicitement jointe par l'utilisateur.
            workspace: Contexte workspace (.prism/ + SIF active).
            attachments: Fichiers workspace joints explicitement pour cette requête.
            custom_system_prompt: System prompt personnalisé (depuis config chat).
            strict_mode: Active les garde-fous PRISM stricts.
            response_mode: Mode de réponse métier (ex: draft_note).
            provider_override: Forcer un provider (ignore la config globale).
        """
        provider = provider_override or self._cfg.provider
        last_user_message = next(
            (m.content for m in reversed(messages) if m.role == "user"), ""
        )
        prepared_attachments = await self._prepare_attachments(attachments)

        system_prompt = self._build_system_prompt(
            workspace=workspace,
            attached_context=attached_context,
            attachments=prepared_attachments,
            last_user_message=last_user_message,
            custom_system_prompt=custom_system_prompt,
            strict_mode=strict_mode,
            response_mode=response_mode,
        )

        logger.debug(
            "AI stream | provider=%s | messages=%d | system_prompt=%d chars",
            provider, len(messages), len(system_prompt),
        )

        if provider == "anthropic":
            async for chunk in self._stream_anthropic(system_prompt, messages):
                yield chunk
        elif provider == "mistral":
            async for chunk in self._stream_mistral(system_prompt, messages, prepared_attachments):
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
