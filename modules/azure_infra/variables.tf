variable "resource_group_name" {
  type        = string
  description = "Tên của Resource Group trên Azure"
  default     = "DevOps-Microservices-RG"
}

variable "location" {
  type        = string
  description = "Vị trí đặt server (Region)"
  default     = "eastus" # Đã sửa từ southeastasia sang eastus để không bị chặn
}

variable "environment" {
  type        = string
  description = "Môi trường triển khai (staging hoặc production)"
  default     = "dev"
}

variable "vm_size" {
  type        = string
  description = "Kích thước của máy ảo"
  default     = "Standard_B1s"
}
