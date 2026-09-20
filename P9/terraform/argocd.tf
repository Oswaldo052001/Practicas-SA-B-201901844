# Instalacion de ArgoCD via Terraform (criterio 2.1 / 3.2 "Bootstrap de dia
# cero"). Mismos ajustes que usaba el script manual de P8
# (gitops-bootstrap/bootstrap-argocd.sh, ahora en desuso a partir de P9)
# para no cambiar el comportamiento conocido: Dex (SSO), el
# notifications-controller y el ApplicationSet controller siguen
# apagados porque no se usan y el cluster es de nodos e2-small (no sobra
# CPU/memoria para componentes que no hacen falta). El patron elegido para
# "app-of-apps o ApplicationSet" es app-of-apps (ver bootstrap-app.tf),
# asi que el controlador de ApplicationSet no se necesita.
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = var.argocd_namespace
  create_namespace = true

  set {
    name  = "dex.enabled"
    value = "false"
  }

  set {
    name  = "notifications.enabled"
    value = "false"
  }

  set {
    name  = "applicationSet.enabled"
    value = "false"
  }

  # Servidor en modo insecure/HTTP interno: se accede via
  # "kubectl port-forward", igual que en P8, sin exponerlo a internet ni
  # pagar un LoadBalancer aparte.
  set {
    name  = "configs.params.server\\.insecure"
    value = "true"
  }

  wait    = true
  timeout = 300

  depends_on = [
    google_container_node_pool.sa_p8_nodes,
    kubernetes_namespace.sa_p8,
  ]
}
