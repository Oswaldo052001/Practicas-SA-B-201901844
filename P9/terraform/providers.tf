provider "google" {
  project = var.project_id
  region  = "us-central1"
}

data "google_client_config" "default" {}

# Se lee el cluster ya creado para poder configurar los providers de
# kubernetes/helm contra el endpoint correcto una vez que el node pool
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

provider "helm" {
  kubernetes {
    host                   = "https://${data.google_container_cluster.sa_p8.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(data.google_container_cluster.sa_p8.master_auth[0].cluster_ca_certificate)
  }
}

# Estado del stack "durable" (bucket de respaldos de Velero + cuenta de
# servicio), aplicado por separado y nunca destruido. Ver
# ../terraform-durable/backend.tf.
data "terraform_remote_state" "durable" {
  backend = "gcs"
  config = {
    bucket = "sa-201901844-tfstate"
    prefix = "p9/state-durable"
  }
}
