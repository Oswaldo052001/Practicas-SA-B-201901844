# Velero (criterio 3.3 "Velero para respaldo y restauracion" / 2.3
# "Respaldo y restauracion con Velero"). Se instala por Terraform, igual
# que ArgoCD, porque es plataforma (el motor de respaldo en si), no
# configuracion de la aplicacion - la CONFIGURACION de los respaldos
# (los Schedule, cuando corren y que retienen) si vive en el repo GitOps,
# ver bootstrap/velero-resources alla, porque esa parte SI es declarativa
# y versionable como cualquier otro recurso de la aplicacion.
#
# Usa el plugin nativo de GCP: snapshots de los discos persistentes (PD)
# via la API de Compute, sin necesidad del node-agent/restic (mas simple y
# mas rapido para el tamano de este cluster).
resource "helm_release" "velero" {
  name             = "velero"
  repository       = "https://vmware-tanzu.github.io/helm-charts"
  chart            = "velero"
  namespace        = var.velero_namespace
  create_namespace = true

  set {
    name  = "configuration.backupStorageLocation[0].name"
    value = "default"
  }

  set {
    name  = "configuration.backupStorageLocation[0].provider"
    value = "gcp"
  }

  set {
    name  = "configuration.backupStorageLocation[0].bucket"
    value = data.terraform_remote_state.durable.outputs.velero_bucket_name
  }

  set {
    name  = "configuration.volumeSnapshotLocation[0].name"
    value = "default"
  }

  set {
    name  = "configuration.volumeSnapshotLocation[0].provider"
    value = "gcp"
  }

  set {
    name  = "initContainers[0].name"
    value = "velero-plugin-for-gcp"
  }

  set {
    name  = "initContainers[0].image"
    value = "velero/velero-plugin-for-gcp:v1.10.0"
  }

  set {
    name  = "initContainers[0].volumeMounts[0].mountPath"
    value = "/target"
  }

  set {
    name  = "initContainers[0].volumeMounts[0].name"
    value = "plugins"
  }

  # Credenciales de la cuenta de servicio dedicada (stack "durable"),
  # inyectadas directo como Secret de Kubernetes por el propio chart de
  # Velero. "set_sensitive" evita que el valor quede en texto plano en los
  # logs de "terraform apply" o en el plan.
  set_sensitive {
    name  = "credentials.secretContents.cloud"
    value = base64decode(data.terraform_remote_state.durable.outputs.velero_sa_key_b64)
  }

  # No hace falta node-agent (restic/kopia): el plugin de GCP respalda el
  # contenido de los PersistentVolume via snapshots nativos de GCE PD.
  set {
    name  = "deployNodeAgent"
    value = "false"
  }

  wait    = true
  timeout = 300

  depends_on = [
    google_container_node_pool.sa_p8_nodes,
  ]
}
