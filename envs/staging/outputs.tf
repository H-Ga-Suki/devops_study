output "vm_public_ip" {
  value       = module.azure_infra.vm_public_ip
  description = "Địa chỉ IP Public của máy ảo Staging"
}
