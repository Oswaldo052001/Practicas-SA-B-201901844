provider "google" {
  project = var.project_id
  region  = "us-central1"
}

data "google_client_config" "default" {}

# Se lee el cluster ya creado para poder configurar el provider de
# kubernetes contra el endpoint correcto una vez que el node pool
# termino de crearse.
data "google_container_cluster" "sa_p8" {
  name     = google_container_cluster.sa_p8.name
  location = var.zone

  depends_on = [google_container_node_pool.sa_p8_nodes]
}

provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.sa_p8.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.sa_p8.master_auth[0].cluster_ca_certificate)
}

