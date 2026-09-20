# Identico a P8/terraform/namespace.tf (mismo nombre de recurso, ver nota
# en cluster.tf).
resource "kubernetes_namespace" "sa_p8" {
  metadata {
    name = var.namespace

    labels = {
      practica = "p9"
      curso    = "software-avanzado"
    }
  }
}
