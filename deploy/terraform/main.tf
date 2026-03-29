terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
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
