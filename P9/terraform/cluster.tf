# Identico a P8/terraform/cluster.tf a proposito: mismos nombres de
# recurso (google_container_cluster.sa_p8, google_container_node_pool.
# sa_p8_nodes) para que "terraform init -migrate-state" mueva el estado
# existente sin necesidad de "terraform state mv" y sin que Terraform
# quiera destruir y recrear el cluster que ya esta calificado y en uso.
resource "google_container_cluster" "sa_p8" {
  name     = var.cluster_name
  location = var.zone
  project  = var.project_id

  # El pool de nodos por defecto se elimina: el pool real se define
  # aparte (mas abajo) para poder controlar tamano, tipo de maquina
  # y costo de forma explicita.
  remove_default_node_pool = true
  initial_node_count       = 1

  networking_mode = "VPC_NATIVE"
  network         = data.google_compute_network.default.id
  subnetwork      = google_compute_subnetwork.sa_p8_subnet.id

  # Rangos secundarios explicitos (definidos en subnet.tf), en vez de
  # dejar que GKE intente asignarlos automaticamente sobre la red
  # compartida "default".
  ip_allocation_policy {
    cluster_secondary_range_name  = "sa-p8-pods"
    services_secondary_range_name = "sa-p8-services"
  }

  release_channel {
    channel = "REGULAR"
  }

  # Sin esto, "terraform destroy" se niega a borrar el cluster. La Practica
  # 9 exige justamente poder destruirlo y reconstruirlo con el cronometro
  # corriendo (prueba de recuperacion), asi que se deja en false a
  # proposito.
  deletion_protection = false
}

resource "google_container_node_pool" "sa_p8_nodes" {
  name     = "${var.cluster_name}-pool"
  cluster  = google_container_cluster.sa_p8.name
  location = var.zone
  project  = var.project_id

  node_count = var.node_count

  node_config {
    machine_type = var.node_machine_type
    disk_size_gb = 30
    disk_type    = "pd-standard"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      practica = "p9"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
