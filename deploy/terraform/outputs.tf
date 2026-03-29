output "app_url" {
  description = "Public HTTPS URL of the deployed application."
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "app_service_name" {
  description = "Name of the Azure App Service (used by deploy.sh)."
  value       = azurerm_linux_web_app.main.name
}

output "resource_group_name" {
  description = "Name of the Resource Group (used by deploy.sh)."
  value       = azurerm_resource_group.main.name
}

output "app_service_plan_id" {
  description = "Resource ID of the App Service Plan."
  value       = azurerm_service_plan.main.id
}

output "deploy_command" {
  description = "Hint: run this from the project root to push code after provisioning."
  value       = "cd /path/to/cohabit-finance && ./deploy.sh"
}
