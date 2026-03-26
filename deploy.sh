#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Deploy Cohabit Finance to Azure App Service from local machine
#
# Requirements:
#   - Azure CLI installed (https://learn.microsoft.com/cli/azure/install-azure-cli)
#   - Node.js + npm installed
#   - zip installed (macOS: brew install zip)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
ZIP_PATH="/tmp/cohabit-deploy.zip"

# ── Validation ────────────────────────────────────────────────────────────────
if ! command -v az &>/dev/null; then
  echo "❌  Azure CLI not found. Install it from https://learn.microsoft.com/cli/azure/install-azure-cli"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "❌  npm not found. Install Node.js from https://nodejs.org"
  exit 1
fi

if ! command -v zip &>/dev/null; then
  echo "❌  zip not found. On macOS: brew install zip"
  exit 1
fi

# ── Azure login ──────────────────────────────────────────────────────────────
echo "🔐  Verificando sesión en Azure..."
if ! az account show &>/dev/null; then
  echo "   No hay sesión activa — iniciando login..."
  az login
fi
echo "✅  Conectado como: $(az account show --query user.name -o tsv)"
echo ""

# ── Seleccionar suscripción ───────────────────────────────────────────────────
echo "📋  Suscripciones disponibles:"
OLD_IFS="$IFS"
IFS=$'\n'
SUBSCRIPTION_NAMES=($(az account list --query "[].name" -o tsv 2>/dev/null))
IFS="$OLD_IFS"

if [[ ${#SUBSCRIPTION_NAMES[@]} -eq 0 ]]; then
  echo "❌  No se encontraron suscripciones. Verifica tu cuenta de Azure."
  exit 1
elif [[ ${#SUBSCRIPTION_NAMES[@]} -eq 1 ]]; then
  SELECTED_SUB="${SUBSCRIPTION_NAMES[0]}"
  echo "   → ${SELECTED_SUB}"
else
  for i in "${!SUBSCRIPTION_NAMES[@]}"; do
    echo "   $((i+1))) ${SUBSCRIPTION_NAMES[$i]}"
  done
  while true; do
    read -rp "   Elige el número de suscripción: " SUB_NUM
    if [[ "$SUB_NUM" =~ ^[0-9]+$ ]] && (( SUB_NUM >= 1 && SUB_NUM <= ${#SUBSCRIPTION_NAMES[@]} )); then
      SELECTED_SUB="${SUBSCRIPTION_NAMES[$((SUB_NUM-1))]}"
      break
    fi
    echo "   ⚠️  Número inválido, intenta de nuevo."
  done
fi
az account set --name "$SELECTED_SUB"
echo ""

# ── Seleccionar Resource Group ────────────────────────────────────────────────
echo "🗂   Resource Groups en '$SELECTED_SUB':"
OLD_IFS="$IFS"
IFS=$'\n'
RESOURCE_GROUPS=($(az group list --query "[].name" -o tsv 2>/dev/null | sort))
IFS="$OLD_IFS"

if [[ ${#RESOURCE_GROUPS[@]} -eq 0 ]]; then
  echo "❌  No se encontraron Resource Groups."
  exit 1
fi

for i in "${!RESOURCE_GROUPS[@]}"; do
  echo "   $((i+1))) ${RESOURCE_GROUPS[$i]}"
done
while true; do
  read -rp "   Elige el número de Resource Group: " RG_NUM
  if [[ "$RG_NUM" =~ ^[0-9]+$ ]] && (( RG_NUM >= 1 && RG_NUM <= ${#RESOURCE_GROUPS[@]} )); then
    AZURE_RESOURCE_GROUP="${RESOURCE_GROUPS[$((RG_NUM-1))]}"
    break
  fi
  echo "   ⚠️  Número inválido, intenta de nuevo."
done
echo ""

# ── Seleccionar App Service ───────────────────────────────────────────────────
echo "🌐  App Services en '$AZURE_RESOURCE_GROUP':"
OLD_IFS="$IFS"
IFS=$'\n'
APP_SERVICES=($(az webapp list --resource-group "$AZURE_RESOURCE_GROUP" --query "[].name" -o tsv 2>/dev/null | sort))
IFS="$OLD_IFS"

if [[ ${#APP_SERVICES[@]} -eq 0 ]]; then
  echo "❌  No se encontraron App Services en el Resource Group '$AZURE_RESOURCE_GROUP'."
  exit 1
fi

for i in "${!APP_SERVICES[@]}"; do
  echo "   $((i+1))) ${APP_SERVICES[$i]}"
done
while true; do
  read -rp "   Elige el número de App Service: " APP_NUM
  if [[ "$APP_NUM" =~ ^[0-9]+$ ]] && (( APP_NUM >= 1 && APP_NUM <= ${#APP_SERVICES[@]} )); then
    AZURE_WEBAPP_NAME="${APP_SERVICES[$((APP_NUM-1))]}"
    break
  fi
  echo "   ⚠️  Número inválido, intenta de nuevo."
done

echo ""
echo "─────────────────────────────────────────────"
echo "   Suscripción    : $SELECTED_SUB"
echo "   Resource Group : $AZURE_RESOURCE_GROUP"
echo "   App Service    : $AZURE_WEBAPP_NAME"
echo "─────────────────────────────────────────────"
echo ""

# ── Step 1: Build frontend ────────────────────────────────────────────────────
echo "📦  [1/5] Building React frontend..."
cd "$FRONTEND_DIR"
npm ci --silent
npm run build
echo "   Done → backend/frontend/dist/"
echo ""

# ── Step 2: Create deployment zip ────────────────────────────────────────────
echo "🗜   [2/5] Creating deployment package..."
cd "$BACKEND_DIR"

# Remove old zip if exists
[[ -f "$ZIP_PATH" ]] && rm "$ZIP_PATH"

# Zip backend/ excluding heavy/sensitive paths
zip -r "$ZIP_PATH" . \
  --exclude "*.pyc" \
  --exclude "*/__pycache__/*" \
  --exclude "*/.venv/*" \
  --exclude "*/venv/*" \
  --exclude "*/data/*" \
  --exclude "*/.env" \
  --exclude "*/node_modules/*" \
  --exclude "*/.DS_Store" \
  -q

echo "   Package: $ZIP_PATH ($(du -sh "$ZIP_PATH" | cut -f1))"
echo ""

# ── Step 3: Sync environment variables from .env ─────────────────────────────
echo "⚙️   [3/5] Syncing environment variables to Azure App Settings..."
ENV_FILE="$SCRIPT_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="$BACKEND_DIR/.env"
fi

if [[ -f "$ENV_FILE" ]]; then
  # Build list of "KEY=VALUE" pairs, skipping comments, blank lines, and DATABASE_URL
  # (DATABASE_URL is handled by COHABIT_DATA_DIR logic in main.py on Azure)
  SETTINGS_ARGS=()
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue   # skip blank
    [[ "$line" =~ ^[[:space:]]*# ]]  && continue   # skip comments
    KEY="${line%%=*}"
    [[ "$KEY" == "DATABASE_URL" ]] && continue      # Azure uses /home/data path
    SETTINGS_ARGS+=("$line")
  done < "$ENV_FILE"

  if [[ ${#SETTINGS_ARGS[@]} -gt 0 ]]; then
    az webapp config appsettings set \
      --name "$AZURE_WEBAPP_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --settings "${SETTINGS_ARGS[@]}" \
      --output none
    echo "   Variables sincronizadas: ${#SETTINGS_ARGS[@]}"
    for s in "${SETTINGS_ARGS[@]}"; do
      echo "   · ${s%%=*}"
    done
  else
    echo "   No hay variables para sincronizar."
  fi
else
  echo "   ⚠️  No se encontró archivo .env — saltando este paso."
  echo "   Asegúrate de tener SECRET_KEY configurado en Azure Portal."
fi
echo ""

# ── Step 4: Deploy to Azure ───────────────────────────────────────────────────
echo "🚀  [4/5] Deploying to Azure App Service '$AZURE_WEBAPP_NAME'..."
az webapp deploy \
  --name "$AZURE_WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --src-path "$ZIP_PATH" \
  --type zip \
  --async false

echo ""

# ── Step 5: Verify ───────────────────────────────────────────────────────────
echo "🔍  [5/5] Checking app status..."
STATE=$(az webapp show \
  --name "$AZURE_WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query state -o tsv)

URL="https://$(az webapp show \
  --name "$AZURE_WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query defaultHostName -o tsv)"

echo ""
echo "─────────────────────────────────────────────"
echo "✅  Deploy complete!"
echo "   Status : $STATE"
echo "   URL    : $URL"
echo "─────────────────────────────────────────────"
