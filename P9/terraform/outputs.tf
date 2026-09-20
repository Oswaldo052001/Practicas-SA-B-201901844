output "cluster_name" {
  value = google_container_cluster.sa_p8.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.sa_p8.endpoint
  sensitive = true
}

output "namespace" {
  value = kubernetes_namespace.sa_p8.metadata[0].name
}

output "argocd_namespace" {
  value = helm_release.argocd.namespace
}

output "velero_namespace" {
  value = helm_release.velero.namespace
}

output "velero_bucket_name" {
  value = data.terraform_remote_state.durable.outputs.velero_bucket_name
}
