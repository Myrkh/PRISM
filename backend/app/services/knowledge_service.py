"""
knowledge_service.py — PRISM AI Knowledge Base Loader

Charge et met en cache les fichiers Markdown de la knowledge base.
Ces fichiers définissent l'expertise métier de l'IA (IEC 61511, SIL, PRISM).

Usage:
    from app.services.knowledge_service import KnowledgeService
    ks = KnowledgeService()
    context = ks.build_knowledge_context(query="PFD 2oo3")
"""
from __future__ import annotations

import logging
from functools import cached_property
from pathlib import Path

logger = logging.getLogger(__name__)

# Chemin relatif au dossier backend/
KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "knowledge"

# Ordre d'injection et poids de chaque fichier
KNOWLEDGE_FILES: list[dict] = [
    {
        "id": "iec61511",
        "path": "iec61511-part1.md",
        "always": True,
        "keywords": ["iec", "61511", "sil", "srs", "pfd", "sff", "contrainte", "architectural"],
        "description": "IEC 61511 — Exigences fondamentales",
    },
    {
        "id": "sil_methodology",
        "path": "sil-methodology.md",
        "always": True,
        "keywords": ["pfd", "calcul", "formule", "lambda", "beta", "dc", "sff", "proof test", "pst", "réponse"],
        "description": "Méthodologie calcul SIL",
    },
    {
        "id": "hazop_lopa",
        "path": "hazop-lopa.md",
        "always": False,
        "keywords": ["hazop", "lopa", "risque", "ipl", "initiateur", "déviation", "mot guide", "nœud"],
        "description": "HAZOP & LOPA",
    },
    {
        "id": "components",
        "path": "components-guide.md",
        "always": False,
        "keywords": ["composant", "capteur", "vanne", "logic", "actuateur", "transmetteur", "λd", "lambdad", "architecture", "1oo", "2oo"],
        "description": "Guide composants SIS",
    },
    {
        "id": "prism_guide",
        "path": "prism-guide.md",
        "always": True,
        "keywords": ["prism", "onglet", "workflow", "bibliothèque", "cockpit", "vérification", "rapport", "révision"],
        "description": "Guide application PRISM",
    },
]


class KnowledgeService:
    """Charge et expose la base de connaissance métier pour le contexte IA."""

    def __init__(self, knowledge_dir: Path | None = None) -> None:
        self._dir = knowledge_dir or KNOWLEDGE_DIR
        self._cache: dict[str, str] = {}

    # ── Chargement ────────────────────────────────────────────────────────────

    def _load_file(self, filename: str) -> str | None:
        """Charge un fichier Markdown depuis le dossier knowledge/."""
        if filename in self._cache:
            return self._cache[filename]

        path = self._dir / filename
        if not path.exists():
            logger.warning("Knowledge file not found: %s", path)
            return None

        content = path.read_text(encoding="utf-8")
        self._cache[filename] = content
        logger.debug("Loaded knowledge file: %s (%d chars)", filename, len(content))
        return content

    def load_all(self) -> dict[str, str]:
        """Charge tous les fichiers de la knowledge base."""
        result: dict[str, str] = {}
        for meta in KNOWLEDGE_FILES:
            content = self._load_file(meta["path"])
            if content:
                result[meta["id"]] = content
        return result

    # ── Sélection intelligente ────────────────────────────────────────────────

    def select_relevant(self, query: str) -> list[str]:
        """
        Retourne les IDs des fichiers pertinents pour une requête donnée.
        Toujours inclure les fichiers marqués always=True.
        Inclure les autres si la requête contient leurs mots-clés.
        """
        query_lower = query.lower()
        selected: list[str] = []

        for meta in KNOWLEDGE_FILES:
            if meta["always"]:
                selected.append(meta["id"])
            elif any(kw in query_lower for kw in meta["keywords"]):
                selected.append(meta["id"])

        return selected

    # ── Construction du contexte ──────────────────────────────────────────────

    def build_knowledge_context(
        self,
        query: str = "",
        max_chars: int = 40_000,
    ) -> str:
        """
        Construit le bloc de contexte à injecter dans le system prompt.

        Args:
            query: La question de l'utilisateur (pour sélection des fichiers pertinents).
            max_chars: Limite de caractères totale (pour modèles à faible contexte).

        Returns:
            Texte Markdown formaté, prêt à être injecté dans le prompt.
        """
        relevant_ids = self.select_relevant(query)
        sections: list[str] = []
        total_chars = 0

        for meta in KNOWLEDGE_FILES:
            if meta["id"] not in relevant_ids:
                continue

            content = self._load_file(meta["path"])
            if not content:
                continue

            # Vérifier la limite de tokens
            if total_chars + len(content) > max_chars:
                logger.debug(
                    "Skipping %s — would exceed max_chars (%d + %d > %d)",
                    meta["id"], total_chars, len(content), max_chars,
                )
                # Pour les fichiers always, inclure quand même un résumé tronqué
                if meta["always"]:
                    truncated = content[: max_chars - total_chars - 200]
                    sections.append(f"{truncated}\n\n[... document tronqué pour respecter la limite de contexte]")
                    total_chars = max_chars
                break

            sections.append(content)
            total_chars += len(content)

        if not sections:
            return ""

        header = (
            "# Base de connaissance PRISM — Contexte métier\n\n"
            "> Les sections suivantes définissent les règles et formules "
            "IEC 61511 que tu dois appliquer dans tes réponses.\n\n"
            "---\n\n"
        )

        return header + "\n\n---\n\n".join(sections)

    # ── Diagnostic ────────────────────────────────────────────────────────────

    def status(self) -> dict:
        """Retourne l'état de la knowledge base (pour health check)."""
        files_status = []
        for meta in KNOWLEDGE_FILES:
            path = self._dir / meta["path"]
            files_status.append({
                "id": meta["id"],
                "path": str(path),
                "exists": path.exists(),
                "size_bytes": path.stat().st_size if path.exists() else 0,
                "always": meta["always"],
                "description": meta["description"],
            })
        return {
            "knowledge_dir": str(self._dir),
            "files": files_status,
            "loaded_in_cache": list(self._cache.keys()),
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
_instance: KnowledgeService | None = None


def get_knowledge_service() -> KnowledgeService:
    """Retourne l'instance singleton du KnowledgeService."""
    global _instance
    if _instance is None:
        _instance = KnowledgeService()
    return _instance
