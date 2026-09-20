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
  description = "Nombre del cluster GKE. Se mantiene el mismo nombre que en la Practica 8 (sa-p8-cluster): es el MISMO cluster, ahora gestionado desde este stack en vez de P8/terraform. Ver README de P9 sobre la migracion de estado."
  type        = string
  default     = "sa-p8-cluster"
}

variable "namespace" {
  description = "Namespace donde viven los microservicios"
  type        = string
  default     = "sa-p8"
}

variable "node_machine_type" {
  description = "Tipo de maquina de los nodos del cluster"
  type        = string
  default     = "e2-small"
}

variable "node_count" {
  description = "Cantidad de nodos del pool (fijo, sin autoscaling, para controlar el costo)"
  type        = number
  default     = 4
}

variable "argocd_namespace" {
  description = "Namespace donde se instala ArgoCD"
  type        = string
  default     = "argocd"
}

variable "velero_namespace" {
  description = "Namespace donde se instala Velero"
  type        = string
  default     = "velero"
}

variable "sealed_secrets_namespace" {
  description = "Namespace donde se instala el controlador de Sealed Secrets. Se mantiene kube-system (igual que en P8/gitops-bootstrap/bootstrap-argocd.sh) para que kubeseal siga funcionando sin flags extra en la maquina del estudiante."
  type        = string
  default     = "kube-system"
}

variable "gitops_repo_url" {
  description = "URL del repositorio GitOps"
  type        = string
  default     = "https://github.com/Oswaldo052001/Practicas-SA-B-201901844-gitops.git"
}
