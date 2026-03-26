#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ Starting backend (port 8000, hot-reload)..."
cd "$ROOT/backend"
source "$ROOT/.venv/bin/activate"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo "▶ Starting frontend (Vite HMR)..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo "  API docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."
wait
