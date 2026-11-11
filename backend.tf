terraform {
  backend "azurerm" {
    resource_group_name  = "DevOps-Microservices-RG" # Thay bằng tên Resource Group của bạn
    storage_account_name = "devopstfstate999"        # ĐỔI TÊN NÀY thành tên Storage Account của bạn
    container_name       = "tfstate"
    key                  = "microservices.terraform.tfstate"
  }
}