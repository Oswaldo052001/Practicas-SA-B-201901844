provider "google" {
  project = var.project_id
  region  = var.region
}

# -----------------------------------------------------------------------
# Bucket de respaldos de Velero. Externo al cluster que se respalda
# (criterio 3.3 "almacenamiento de objetos externo al cluster") y externo
# tambien al ESTADO de Terraform que se destruye en la prueba de DR (ver
# comentario en backend.tf).
# -----------------------------------------------------------------------
resource "google_storage_bucket" "velero_backups" {
  name     = var.backup_bucket_name
  project  = var.project_id
  location = var.region

  uniform_bucket_level_access = true

  # Versionado: si algo (un bug, un "velero backup delete" por error)
  # sobreescribe o borra un objeto de respaldo, la version anterior sigue
  # recuperable durante backup_retention_days. Defensa adicional contra el
  # escenario "GitLab 2017" (los 5 mecanismos de respaldo fallaban en
  # silencio y nadie lo notaba hasta que ya era tarde): con versionado, un
  # respaldo corrupto no destruye el respaldo bueno anterior.
  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      days_since_noncurrent_time = var.backup_retention_days
    }
    action {
      type = "Delete"
    }
  }

  # No se permite "terraform destroy" de este bucket si tiene objetos
  # dentro: evita que un "terraform destroy" accidental (ej. corrido en la
  # carpeta equivocada) borre los respaldos.
  force_destroy = false
}

# -----------------------------------------------------------------------
# Cuenta de servicio dedicada para que Velero pueda escribir/leer el bucket.
# De menor privilegio posible: solo Storage Object Admin, y solo sobre ESTE
# bucket (no a nivel de proyecto).
# -----------------------------------------------------------------------
resource "google_service_account" "velero" {
  project      = var.project_id
  account_id   = "velero-backup"
  display_name = "Velero (Practica 9) - respaldo/restauracion a GCS"
}

resource "google_storage_bucket_iam_member" "velero_backup_writer" {
  bucket = google_storage_bucket.velero_backups.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.velero.email}"
}

# La cuenta tambien necesita poder crear/leer snapshots de los discos
# persistentes (PD) que respalda con el plugin nativo de GCP - los datos de
# postgresql viven en un PersistentVolume respaldado por un disco de GCE.
resource "google_project_iam_member" "velero_compute_snapshot" {
  project = var.project_id
  role    = "roles/compute.storageAdmin"
  member  = "serviceAccount:${google_service_account.velero.email}"
}

# Llave de la cuenta de servicio. Terraform la guarda en el state (por eso
# el backend remoto de este stack usa un prefix propio y el bucket de
# estado NO debe hacerse publico). El stack principal (../terraform) la lee
# via "terraform_remote_state" y la inyecta directo al Helm release de
# Velero, sin volver a escribirla en ningun archivo del repositorio.
resource "google_service_account_key" "velero" {
  service_account_id = google_service_account.velero.name
}
