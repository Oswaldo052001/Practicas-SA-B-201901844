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

# Namespace explicito (ya no lo crea el chart con "create_namespace"),
# porque el Secret de credenciales de abajo tiene que existir ANTES de
# instalar el chart - ver el comentario en "kubernetes_secret.velero_credentials".
resource "kubernetes_namespace" "velero" {
  metadata {
    name = var.velero_namespace
  }

  depends_on = [google_container_node_pool.sa_p8_nodes]
}

# Credenciales de la cuenta de servicio dedicada (stack "durable"), como un
# Secret de Kubernetes aparte en vez de "set_sensitive" en el helm_release.
#
# Por que el cambio (Terraform hasta aqui usaba "set_sensitive"): tanto
# "set" como "set_sensitive" en el provider de Helm usan el mismo parser
# de "--set" (pares clave=valor separados por comas), y el contenido de la
# llave de la cuenta de servicio es un JSON multilinea con comillas y
# saltos de linea - ese parser lo rompe ("key \"\n\" has no value") ANTES
# de que Terraform pueda ocultar el valor, asi que la llave privada quedo
# impresa en texto plano en la terminal cuando el apply fallo (ver
# docs/runbook-recuperacion.md). El atributo "data" de "kubernetes_secret"
# si esta marcado como sensible por el provider de Kubernetes (no se
# imprime ni en el plan ni en el apply) y no pasa por ningun parser de
# texto: es un mapa de Terraform normal, no una cadena "--set".
resource "kubernetes_secret" "velero_credentials" {
  metadata {
    name      = "velero-credentials"
    namespace = kubernetes_namespace.velero.metadata[0].name
  }

  data = {
    # Debe llamarse exactamente "cloud": es la unica llave que el chart de
    # Velero lee cuando se usa "credentials.existingSecret" (values.yaml
    # del chart, seccion "credentials" - "Velero only uses one secret
    # key/value at a time. The key must be named `cloud`").
    cloud = base64decode(data.terraform_remote_state.durable.outputs.velero_sa_key_b64)
  }

  type = "Opaque"
}

resource "helm_release" "velero" {
  name             = "velero"
  repository       = "https://vmware-tanzu.github.io/helm-charts"
  chart            = "velero"
  namespace        = kubernetes_namespace.velero.metadata[0].name
  create_namespace = false

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

  # Secret ya existente (creado arriba por Terraform), en vez de que el
  # chart genere el suyo con "secretContents" - ver el comentario en
  # "kubernetes_secret.velero_credentials" sobre por que.
  set {
    name  = "credentials.useSecret"
    value = "true"
  }

  set {
    name  = "credentials.existingSecret"
    value = kubernetes_secret.velero_credentials.metadata[0].name
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
    kubernetes_namespace.velero,
    kubernetes_secret.velero_credentials,
    google_container_node_pool.sa_p8_nodes,
  ]
}
