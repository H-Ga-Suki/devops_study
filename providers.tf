terraform {
  required_version = ">= 1.0.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100.0"
    }
  }
}

provider "azurerm" {
  features {}

  subscription_id = "d3ef7630-d855-4e29-88ce-18a9314e2ff8"
  tenant_id       = "34d9d42a-8f0a-4c18-b4ff-a0c83642e723"
}
