resource "kubernetes_namespace" "sa_p8" {
  metadata {
    name = var.namespace

    labels = {
      practica = "p8"
      curso    = "software-avanzado"
    }
  }
}
