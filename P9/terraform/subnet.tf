# Identico a P8/terraform/subnet.tf (mismos nombres de recurso, ver nota en
# cluster.tf sobre la migracion de estado).
data "google_compute_network" "default" {
  name    = "default"
  project = var.project_id
}

resource "google_compute_subnetwork" "sa_p8_subnet" {
  name          = "sa-p8-subnet"
  project       = var.project_id
  region        = "us-central1"
  network       = data.google_compute_network.default.id
  ip_cidr_range = "10.60.0.0/20"

  secondary_ip_range {
    range_name    = "sa-p8-pods"
    ip_cidr_range = "10.61.0.0/16"
  }

  secondary_ip_range {
    range_name    = "sa-p8-services"
    ip_cidr_range = "10.62.0.0/20"
  }
}

# El firewall automatico "default-allow-internal" de la red default solo
# cubre 10.128.0.0/9. Nuestra subred propia y sus rangos secundarios caen
# fuera de ese rango, asi que esta regla cubre explicitamente el trafico
# interno del cluster (nodo-maestro, nodo-nodo, healthchecks).
resource "google_compute_firewall" "sa_p8_allow_internal" {
  name    = "sa-p8-allow-internal"
  project = var.project_id
  network = data.google_compute_network.default.id

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    "10.60.0.0/20",
    "10.61.0.0/16",
    "10.62.0.0/20",
  ]
}
