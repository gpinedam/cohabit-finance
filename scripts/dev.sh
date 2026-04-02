#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/.venv/bin/activate" ]; then
  echo "▶ Creating virtual environment..."
  python3 -m venv "$ROOT/.venv"
  source "$ROOT/.venv/bin/activate"
  echo "▶ Installing backend dependencies..."
  pip install -r "$ROOT/backend/requirements.txt"
else
  source "$ROOT/.venv/bin/activate"
fi

echo "▶ Starting backend (port 8000, hot-reload)..."
cd "$ROOT/backend"
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "▶ Starting frontend (Vite HMR)..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "▶ Installing frontend dependencies..."
  npm install
fi
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo "  Red WiFi → http://192.168.18.10:5173"
echo "  API docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."
wait
