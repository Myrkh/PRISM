#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON_BIN="$BACKEND_DIR/.venv/bin/python3"
BACKEND_PORT="${BACKEND_PORT:-8000}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Backend venv missing: $PYTHON_BIN" >&2
  echo "Create it and install deps first:" >&2
  echo "  cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

cd "$BACKEND_DIR"
exec "$PYTHON_BIN" -m uvicorn main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
