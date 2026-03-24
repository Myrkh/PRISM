from __future__ import annotations

import json
import os
import sys

from dotenv import load_dotenv

# Charger le .env avant tout import qui lit os.getenv()
# - Dev   : backend/.env (à côté de main.py)
# - .exe  : .env à côté du PRISM-backend.exe (répertoire de l'exécutable)
# override=False : variables système/CI ont toujours la priorité sur .env
if getattr(sys, "frozen", False):
    _env_path = os.path.join(os.path.dirname(sys.executable), ".env")
else:
    _env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=_env_path, override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes.engine import router as engine_router
from app.routes.ai import router as ai_router

APP_VERSION = "0.1.0"


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    if not raw:
        return []

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = [part.strip() for part in raw.split(",") if part.strip()]

    if isinstance(parsed, list):
        return [str(item) for item in parsed if str(item).strip()]

    if isinstance(parsed, str) and parsed.strip():
        return [parsed.strip()]

    return []


app = FastAPI(
    title="PRISM SIL Backend",
    version=APP_VERSION,
    description="Thin HTTP wrapper around the sil-py calculation engine.",
)

cors_origins = _parse_cors_origins()
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health")
@app.get("/api/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "prism-sil-backend",
        "version": APP_VERSION,
    }


app.include_router(engine_router, prefix="/engine", tags=["engine"])
app.include_router(engine_router, prefix="/api/engine", include_in_schema=False)
app.include_router(ai_router)


def _get_frontend_dir() -> str:
    """Retourne le chemin du frontend buildé (compatible PyInstaller + dev)."""
    if getattr(sys, "frozen", False):
        # Bundle PyInstaller — sys._MEIPASS pointe sur _internal/
        return os.path.join(sys._MEIPASS, "frontend")
    # Dev local — frontend/dist copié à côté de main.py
    return os.path.join(os.path.dirname(__file__), "frontend")


# Monter le frontend statique EN DERNIER (catch-all sur "/")
_frontend_dir = _get_frontend_dir()
if os.path.isdir(_frontend_dir):
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")


if __name__ == "__main__" or getattr(sys, "frozen", False):
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
