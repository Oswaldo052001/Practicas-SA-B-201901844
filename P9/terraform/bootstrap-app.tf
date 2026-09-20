# Ultimo paso del bootstrap de dia cero: aplica la Application "raiz" de
# ArgoCD (patron app-of-apps). De ahi en adelante, ArgoCD sincroniza todo
# lo demas (la aplicacion sa-platform, los recursos de Velero, etc.) desde
# el repo GitOps - este es el UNICO "kubectl apply" manual de toda la
# reconstruccion, y esta disparado automaticamente por Terraform dentro de
# un solo "terraform apply", no por una persona (criterio 2.1: "sin pasos
# manuales").
#
# Por que un null_resource + local-exec en vez del provider kubectl_manifest
# o kubernetes_manifest: el recurso a aplicar es un Custom Resource
# (Application, del CRD que el propio helm_release.argocd instala en ESTE
# mismo "terraform apply"). El provider kubernetes_manifest de Hashicorp
# necesita conocer el esquema del CRD en tiempo de "plan", que todavia no
# existe la primera vez - requeriria correr "terraform apply" dos veces
# (eso SI contaria como paso manual). "kubectl apply" via local-exec,
# disparado por Terraform, es el patron recomendado por HashiCorp para este
# caso exacto (un CRD y un recurso de ese CRD en el mismo apply).
resource "null_resource" "bootstrap_app_of_apps" {
  triggers = {
    manifest_sha256 = filesha256("${path.module}/../gitops-bootstrap/root-application.yaml")
  }

  provisioner "local-exec" {
    command = "kubectl apply -f ${path.module}/../gitops-bootstrap/root-application.yaml"
  }

  depends_on = [
    helm_release.argocd,
  ]
}
