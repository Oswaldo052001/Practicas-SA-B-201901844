variable "project_id" {
  description = "ID del proyecto de GCP"
  type        = string
  default     = "cinetix-p6"
}

variable "region" {
  description = "Region donde vive el bucket de respaldos (no zonal: los respaldos deben sobrevivir la perdida de una zona completa, no solo de un nodo)"
  type        = string
  default     = "us-central1"
}

variable "backup_bucket_name" {
  description = "Nombre del bucket de GCS donde Velero guarda los respaldos. Debe ser unico a nivel global en GCS."
  type        = string
  default     = "sa-201901844-velero-backups"
}

variable "backup_retention_days" {
  description = "Retencion por defecto de los objetos del bucket (defensa adicional detras del TTL propio de cada Schedule de Velero, ver P9/gitops-bootstrap y bootstrap/velero-resources en el repo GitOps)"
  type        = number
  default     = 90
}
