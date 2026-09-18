variable "project_id" {
  description = "ID del proyecto de GCP"
  type        = string
  default     = "cinetix-p6"
}

variable "zone" {
  description = "Zona donde se crea el cluster (zonal, no regional, para minimizar costo)"
  type        = string
  default     = "us-central1-c"
}

variable "cluster_name" {
  description = "Nombre del cluster GKE para la Practica 8"
  type        = string
  default     = "sa-p8-cluster"
}

variable "namespace" {
  description = "Namespace donde viven los microservicios de la Practica 8"
  type        = string
  default     = "sa-p8"
}

variable "node_machine_type" {
  description = "Tipo de maquina de los nodos del cluster"
  type        = string
  default     = "e2-small"
}

variable "node_count" {
  description = "Cantidad de nodos del pool (fijo, sin autoscaling, para controlar el costo). Subido de 2 a 3 y luego de 3 a 4: con 3 nodos e2-small no alcanzaba la CPU para pago-service (Java/Spring Boot, 500m request) junto con los demas microservicios + postgres + nats + ArgoCD/Rollouts (confirmado con 'Insufficient cpu' del scheduler en los 3 nodos)."
  type        = number
  default     = 4
}
