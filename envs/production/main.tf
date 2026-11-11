module "azure_infra" {
  source              = "../../modules/azure_infra"
  environment         = "production"
  vm_size             = "Standard_B2ms"
  resource_group_name = "DevOps-Microservices-RG"
  location            = "eastus"
}

