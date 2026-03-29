# ---------------------------------------------------------------------------
# Azure Subscription
# ---------------------------------------------------------------------------
variable "subscription_id" {
  description = "Azure Subscription ID. Run `az account show --query id -o tsv` to find yours."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.subscription_id))
    error_message = "subscription_id must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)."
  }
}

# ---------------------------------------------------------------------------
# Resource Group
# ---------------------------------------------------------------------------
variable "resource_group_name" {
  description = "Name of the Azure Resource Group to create or reuse."
  type        = string
  default     = "cohabit-finance-rg"
}

variable "location" {
  description = "Azure region. Run `az account list-locations -o table` for options."
  type        = string
  default     = "eastus"

  validation {
    condition = contains([
      "eastus", "eastus2", "westus", "westus2", "westus3",
      "centralus", "northcentralus", "southcentralus",
      "westeurope", "northeurope", "uksouth", "ukwest",
      "francecentral", "germanywestcentral",
      "brazilsouth", "canadacentral", "canadaeast",
      "australiaeast", "australiasoutheast",
      "southeastasia", "eastasia", "japaneast", "japanwest",
      "koreacentral", "southafricanorth",
    ], var.location)
    error_message = "Please provide a valid Azure region slug (e.g. 'eastus', 'westeurope')."
  }
}

# ---------------------------------------------------------------------------
# App Service
# ---------------------------------------------------------------------------
variable "app_name" {
  description = "Globally unique name for the App Service. Becomes <app_name>.azurewebsites.net."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]{2,60}$", var.app_name))
    error_message = "app_name must be 2-60 characters, using only letters, digits, and hyphens."
  }
}

variable "sku_name" {
  description = "App Service Plan SKU. F1 = free (no always_on). B1+ recommended for production."
  type        = string
  default     = "B1"

  validation {
    condition     = contains(["F1", "B1", "B2", "B3", "P1v2", "P2v2", "P3v2", "P1v3", "P2v3", "P3v3"], var.sku_name)
    error_message = "sku_name must be one of: F1, B1, B2, B3, P1v2, P2v2, P3v2, P1v3, P2v3, P3v3."
  }
}

# ---------------------------------------------------------------------------
# Application Secrets
# ---------------------------------------------------------------------------
variable "secret_key" {
  description = "Django/FastAPI SECRET_KEY used for JWT signing. Keep this secret. Pass via TF_VAR_secret_key env var."
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Environment & Extra Settings
# ---------------------------------------------------------------------------
variable "environment" {
  description = "Deployment environment tag (e.g. production, staging, development)."
  type        = string
  default     = "production"
}

variable "extra_app_settings" {
  description = "Additional App Settings to merge into the web app. Useful for Azure Files mount credentials."
  type        = map(string)
  default     = {}
  sensitive   = false
}
