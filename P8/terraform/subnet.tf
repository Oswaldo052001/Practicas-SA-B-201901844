# Subred propia, con rangos de IP explicitos, solo para el cluster de
# la Practica 8. Se deja de depender de la asignacion automatica de
# rangos secundarios sobre la red "default" (compartida con P5/P6/P7),
# que es la sospechosa principal de los fallos "Internal error" al
# crear el cluster.

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

# El firewall automatico "default-allow-internal" de la red default
# solo cubre 10.128.0.0/9 (rangos de las subredes automaticas). Nuestra
# subred propia y sus rangos secundarios de pods/servicios caen fuera
# de ese rango, por lo que el trafico interno del cluster (nodo-maestro,
# nodo-nodo, healthchecks) quedaba bloqueado. Esta regla lo cubre
# explicitamente. Esta es la causa real confirmada de los 3 fallos
# anteriores (CLUSTER_HEALTHCHECKING nunca pasaba de 0/2).
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
