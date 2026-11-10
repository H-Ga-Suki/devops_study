variable "resource_group_name" {
  type        = string
  description = "Tên của Resource Group trên Azure"
  default     = "DevOps-Microservices-RG" 
}

variable "location" {
  type        = string
  description = "Vị trí đặt server (Region)"
  default     = "southeastasia"
}
