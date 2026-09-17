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
