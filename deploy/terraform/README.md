# Cohabit Finance — Terraform Infrastructure

Provisions the Azure App Service that hosts the application.
After running `terraform apply`, use `deploy.sh` from the project root to push code.

---

## Terraform Concepts

| Concept | What it does |
|---|---|
| **provider** | Plugin that talks to a cloud API (here: `azurerm` for Azure) |
| **resource** | A real cloud object to create (`azurerm_linux_web_app`, etc.) |
| **variable** | Input value — set in `terraform.tfvars` or via `TF_VAR_*` env vars |
| **output** | Value printed after `apply` (URL, resource name, etc.) |
| **state** | `terraform.tfstate` — Terraform's record of what it created |
| **init** | Downloads providers and sets up the working directory |
| **plan** | Dry-run: shows what *would* change without touching anything |
| **apply** | Creates / updates resources to match the config |
| **destroy** | Deletes all resources managed by this config |

---

## Prerequisites

1. **Terraform >= 1.6** — [install](https://developer.hashicorp.com/terraform/install)
   ```bash
   brew install terraform          # macOS
   terraform version               # verify
   ```

2. **Azure CLI** — [install](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
   ```bash
   brew install azure-cli
   az login
   az account show                 # confirm active subscription
   ```

3. A valid **Azure Subscription** with permission to create Resource Groups and App Services.

---

## Step-by-Step

### 1. Configure Variables

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
subscription_id     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
resource_group_name = "cohabit-finance-rg"
location            = "eastus"
app_name            = "cohabit-finance"   # must be globally unique
sku_name            = "B1"
environment         = "production"
```

For the secret key, use an environment variable (never write it to a file):

```bash
export TF_VAR_secret_key="$(openssl rand -hex 32)"
```

### 2. Initialise

Downloads the `azurerm` provider (~200 MB, one time only):

```bash
terraform init
```

### 3. Plan

Dry-run — shows every resource that will be created:

```bash
terraform plan
```

Expected output:
```
Plan: 3 to add, 0 to change, 0 to destroy.
  + azurerm_resource_group.main
  + azurerm_service_plan.main
  + azurerm_linux_web_app.main
```

### 4. Apply

Creates the resources on Azure (~2–4 minutes):

```bash
terraform apply
```

Type `yes` when prompted. At the end you'll see:

```
Outputs:
  app_url          = "https://cohabit-finance.azurewebsites.net"
  app_service_name = "cohabit-finance"
  resource_group_name = "cohabit-finance-rg"
```

### 5. Deploy Code

Return to the project root and run the existing deploy script:

```bash
cd ../..
./deploy.sh
```

The script will detect the App Service created by Terraform and push a zip deploy.

---

## Updating Infrastructure

To change a variable (e.g. upgrade SKU from B1 to P1v2):

1. Edit `terraform.tfvars`
2. Run `terraform plan` — review the change
3. Run `terraform apply`

---

## Destroying Everything

```bash
terraform destroy
```

This deletes the Resource Group, App Service Plan, and Web App.
**SQLite data at `/home/data/` will be lost** unless you set up Azure Files mount.

---

## Persistent Storage (Azure Files)

By default, Azure App Service storage is ephemeral — the SQLite database and uploaded files
(avatars, wishlist photos) can be lost on restart.

To persist them with Azure Files:

1. Create an Azure Storage Account and File Share:
   ```bash
   az storage account create -n cohabitstore -g cohabit-finance-rg -l eastus --sku Standard_LRS
   az storage share create -n cohabit-data --account-name cohabitstore
   ```

2. Add credentials to `terraform.tfvars`:
   ```hcl
   extra_app_settings = {
     AZURE_FILES_ACCOUNT_NAME = "cohabitstore"
     AZURE_FILES_ACCOUNT_KEY  = "<key>"
     AZURE_FILES_SHARE_NAME   = "cohabit-data"
   }
   ```

3. Update the `storage_account` block in `main.tf` with those values, then `terraform apply`.

---

## Remote State (Team Setup)

Local `terraform.tfstate` is fine for solo use. For a team, store state in Azure Blob:

1. Create a storage account for state:
   ```bash
   az storage account create -n tfstatecohabit -g cohabit-finance-rg -l eastus --sku Standard_LRS
   az storage container create -n tfstate --account-name tfstatecohabit
   ```

2. Uncomment the `backend "azurerm"` block in `main.tf` and fill in the values.

3. Run `terraform init -migrate-state` to move existing state to the remote backend.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| SQLite retained (no Azure SQL) | Avoids migration complexity and ~$5/mo minimum cost; sufficient for household use |
| Single flat module | Project is small; nested modules would add indirection without benefit |
| `always_on = var.sku_name != "F1"` | F1 (free) tier does not support `always_on`; this makes F1 work for dev without a separate config |
| `sensitive = true` on `secret_key` | Prevents the value from being printed in `terraform plan` / `apply` output |
| Local state by default | Easiest starting point; remote state instructions provided above for teams |
| `azurerm ~> 3.100` | Stable, widely tested; v4 was still maturing at the time of writing |
