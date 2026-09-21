# Continuidad de los secretos (criterio 2.4). Se elige "respaldar y
# restaurar la llave de Sealed Secrets" (opcion A del enunciado 3.2) en vez
# de migrar a External Secrets (opcion B): con el tiempo disponible para
# esta practica, agregar External Secrets Operator + un proveedor externo
# (Secret Manager de GCP + Workload Identity) es una superficie mucho mas
# grande para que algo salga mal a dias del limite, y el enunciado acepta
# cualquiera de las dos explicitamente. Queda documentado como posible
# mejora futura en el README.
#
# IMPORTANTE sobre el orden: este null_resource corre DESPUES de instalar
# Velero (necesita el CLI/API de Velero contra el cluster) y ANTES de
# instalar el controlador de Sealed Secrets (ver script para el porque).
resource "null_resource" "sealed_secrets_key_restore" {
  triggers = {
    # Se vuelve a ejecutar en cada "terraform apply" (no solo la primera
    # vez): si aparecio un respaldo nuevo despues de la ultima corrida,
    # conviene poder re-intentar sin tener que destruir el recurso a mano.
    always_run = timestamp()
  }

  provisioner "local-exec" {
    # interpreter fuerza a correr esto con bash, incluso en Windows: sin
    # esto, Terraform intenta correrlo con cmd.exe, que no sabe interpretar
    # un script de bash. Usa var.bash_path en vez de "bash" a secas porque
    # en Windows "bash" resuelve al lanzador de WSL (una distro Linux
    # aparte, sin kubectl/gcloud/velero) y no al bash de Git for Windows -
    # ver comentario en variables.tf.
    interpreter = [var.bash_path, "-c"]
    command     = "${path.module}/scripts/restore-sealed-secrets-key.sh"

    environment = {
      SEALED_SECRETS_NAMESPACE     = var.sealed_secrets_namespace
      SEALED_SECRETS_SCHEDULE_NAME = "sealed-secrets-key-backup"
    }
  }

  depends_on = [
    helm_release.velero,
  ]
}

resource "helm_release" "sealed_secrets" {
  name             = "sealed-secrets"
  repository       = "https://bitnami.github.io/sealed-secrets"
  chart            = "sealed-secrets"
  namespace        = var.sealed_secrets_namespace
  create_namespace = true

  wait    = true
  timeout = 300

  depends_on = [
    null_resource.sealed_secrets_key_restore,
  ]
}
