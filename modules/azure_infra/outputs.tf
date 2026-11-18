output "vm_public_ip" {
  value       = azurerm_public_ip.public_ip.ip_address
  description = "Địa chỉ IP Public của máy ảo"
}