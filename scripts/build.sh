#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ Building frontend..."
cd "$ROOT/frontend"
npm run build

echo "▶ Starting production server..."
cd "$ROOT/backend"
source "$ROOT/.venv/bin/activate"
uvicorn main:app --host 0.0.0.0 --port 8000
