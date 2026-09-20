output "velero_bucket_name" {
  value = google_storage_bucket.velero_backups.name
}

output "velero_service_account_email" {
  value = google_service_account.velero.email
}

# JSON de la llave, en base64 (formato nativo del provider de Google).
# Sensible: nunca se imprime en un "terraform apply" normal ni se escribe a
# archivo por este stack. Solo se lee via "terraform_remote_state" desde
# ../terraform, que la decodifica en memoria e la pasa directo al Helm
# release de Velero con "set_sensitive".
output "velero_sa_key_b64" {
  value     = google_service_account_key.velero.private_key
  sensitive = true
}
