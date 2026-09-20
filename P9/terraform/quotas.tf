# Identico a P8/terraform/quotas.tf (mismos nombres de recurso, mismos
# limites: la Practica 9 no agrega microservicios nuevos, solo hace al
# sistema existente recuperable, asi que el presupuesto de CPU/memoria del
# namespace no cambia).
resource "kubernetes_resource_quota" "sa_p8_quota" {
  metadata {
    name      = "sa-p8-quota"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "1500m"
      "requests.memory" = "3Gi"
      "limits.cpu"      = "4"
      "limits.memory"   = "5Gi"
      "pods"            = "30"
    }
  }
}

resource "kubernetes_limit_range" "sa_p8_limits" {
  metadata {
    name      = "sa-p8-limits"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }

  spec {
    limit {
      type = "Container"

      default = {
        cpu    = "200m"
        memory = "256Mi"
      }

      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }
  }
}
