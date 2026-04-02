#!/bin/bash
# Azure App Service startup script
# This runs inside /home/site/wwwroot/backend/

set -e

# Install dependencies
pip install -r requirements.txt --quiet

# Ensure persistent data directories exist
# Azure App Service persists /home — data dir is symlinked there via app settings
mkdir -p /home/data/avatars

# On first deploy: copy fresh DB scaffold if it doesn't exist yet
# (init_db() handles table creation idempotently at startup)

# Start uvicorn
exec uvicorn main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers 1 \
  --log-level info
