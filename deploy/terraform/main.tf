terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    # null provider lets us run local commands (build + deploy) after provisioning
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }

  # Remote state (optional) — uncomment and fill in to use Azure Blob backend
  # backend "azurerm" {
  #   resource_group_name  = "tfstate-rg"
  #   storage_account_name = "tfstatecohabit"
  #   container_name       = "tfstate"
  #   key                  = "cohabit-finance.tfstate"
  # }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}

# ---------------------------------------------------------------------------
# Resource Group
# ---------------------------------------------------------------------------
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    environment = var.environment
    project     = "cohabit-finance"
  }
}

# ---------------------------------------------------------------------------
# App Service Plan (Linux)
# ---------------------------------------------------------------------------
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.sku_name

  tags = {
    environment = var.environment
    project     = "cohabit-finance"
  }
}

# ---------------------------------------------------------------------------
# Linux Web App
# ---------------------------------------------------------------------------
resource "azurerm_linux_web_app" "main" {
  name                = var.app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  # SQLite data lives at /home/data/ — enable persistent storage
  app_settings = merge(
    {
      SECRET_KEY                     = var.secret_key
      ENVIRONMENT                    = var.environment
      SCM_DO_BUILD_DURING_DEPLOYMENT = "false"
      ENABLE_ORYX_BUILD              = "false"
      WEBSITES_ENABLE_APP_SERVICE_STORAGE = "true"
    },
    var.extra_app_settings
  )

  site_config {
    always_on = var.sku_name != "F1"

    application_stack {
      python_version = "3.11"
    }

    # Frontend is pre-built into backend/static; no Oryx build required
    app_command_line = "cd /home/site/wwwroot/backend && bash startup.sh"
  }

  # Persistent storage (optional) — see README for Azure Files setup.
  # Uncomment and fill in after creating an Azure Storage Account + File Share:
  #
  # storage_account {
  #   name         = "home-data"
  #   type         = "AzureFiles"
  #   account_name = "<storage-account-name>"
  #   share_name   = "<file-share-name>"
  #   access_key   = "<storage-account-key>"
  #   mount_path   = "/home/data"
  # }

  https_only = true

  tags = {
    environment = var.environment
    project     = "cohabit-finance"
  }

  lifecycle {
    # Prevent accidental deletion of the app in production
    prevent_destroy = false
  }
}

# ---------------------------------------------------------------------------
# Post-provisioning deploy
#
# Runs automatically after the App Service is ready.
# Steps: build frontend → zip backend → sync .env → az webapp deploy
#
# Why null_resource + local-exec?
#   Terraform manages infrastructure state, not application code.
#   null_resource is the bridge: run a local shell command as part of
#   terraform apply, after cloud resources exist.
#
# To force a re-deploy without infra changes:
#   terraform taint null_resource.deploy_app && terraform apply
# ---------------------------------------------------------------------------
resource "null_resource" "deploy_app" {
  depends_on = [azurerm_linux_web_app.main]

  triggers = {
    app_name       = azurerm_linux_web_app.main.name
    resource_group = azurerm_resource_group.main.name
  }

  provisioner "local-exec" {
    # path.module = absolute path of deploy/terraform/
    # ../../      = project root (where frontend/ and backend/ live)
    working_dir = "${path.module}/../.."
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail

      ROOT="$(pwd)"
      FRONTEND_DIR="$ROOT/frontend"
      BACKEND_DIR="$ROOT/backend"
      ZIP_PATH="/tmp/cohabit-terraform-deploy.zip"

      # ── [1/4] Build React frontend ──────────────────────────────────────
      echo "📦 [1/4] Building React frontend..."
      cd "$FRONTEND_DIR"
      npm ci --silent
      npm run build
      echo "   Done → backend/frontend/dist/"
      echo ""

      # ── [2/4] Create deployment zip ─────────────────────────────────────
      echo "🗜  [2/4] Creating deployment zip..."
      cd "$BACKEND_DIR"
      [[ -f "$ZIP_PATH" ]] && rm "$ZIP_PATH"
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
      echo "   Package: $ZIP_PATH ($(du -sh $ZIP_PATH | cut -f1))"
      echo ""

      # ── [3/4] Sync .env → Azure App Settings ────────────────────────────
      # DATABASE_URL is intentionally skipped — on Azure, main.py resolves
      # the DB path via COHABIT_DATA_DIR → /home/data/app.db automatically.
      echo "⚙️  [3/4] Syncing .env to Azure App Settings..."
      ENV_FILE="$ROOT/.env"
      [[ ! -f "$ENV_FILE" ]] && ENV_FILE="$BACKEND_DIR/.env"

      if [[ -f "$ENV_FILE" ]]; then
        SETTINGS_ARGS=()
        while IFS= read -r line; do
          [[ "$line" =~ ^[[:space:]]*$ ]] && continue
          [[ "$line" =~ ^[[:space:]]*# ]] && continue
          KEY="$${line%%=*}"
          [[ "$$KEY" == "DATABASE_URL" ]] && continue
          SETTINGS_ARGS+=("$$line")
        done < "$ENV_FILE"

        if [[ $${#SETTINGS_ARGS[@]} -gt 0 ]]; then
          az webapp config appsettings set \
            --name "${azurerm_linux_web_app.main.name}" \
            --resource-group "${azurerm_resource_group.main.name}" \
            --settings "$${SETTINGS_ARGS[@]}" \
            --output none
          echo "   ✅ $${#SETTINGS_ARGS[@]} variables sincronizadas"
          for s in "$${SETTINGS_ARGS[@]}"; do
            echo "   · $${s%%=*}"
          done
        fi
      else
        echo "   ⚠️  No se encontró .env — saltando sync"
        echo "   Asegúrate de tener SECRET_KEY configurado en terraform.tfvars."
      fi
      echo ""

      # ── [4/4] Zip deploy to Azure ────────────────────────────────────────
      echo "🚀 [4/4] Deploying to Azure App Service '${azurerm_linux_web_app.main.name}'..."
      az webapp deploy \
        --name "${azurerm_linux_web_app.main.name}" \
        --resource-group "${azurerm_resource_group.main.name}" \
        --src-path "$ZIP_PATH" \
        --type zip \
        --async false

      URL="https://$(az webapp show \
        --name "${azurerm_linux_web_app.main.name}" \
        --resource-group "${azurerm_resource_group.main.name}" \
        --query defaultHostName -o tsv)"

      echo ""
      echo "─────────────────────────────────────────────"
      echo "✅  Deploy completo!"
      echo "   URL: $URL"
      echo "─────────────────────────────────────────────"
    EOT
  }
}
