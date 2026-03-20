from __future__ import annotations

import json
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.engine import router as engine_router

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
