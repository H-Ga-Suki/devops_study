module "azure_infra" {
  source              = "../../modules/azure_infra"
  environment         = "staging"
  vm_size = "Standard_B2ms"
  resource_group_name = "DevOps-Microservices-RG"
  location = "indiasouthcentral"
}
