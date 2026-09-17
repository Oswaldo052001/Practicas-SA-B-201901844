# ArgoCD: unico componente autorizado a aplicar cambios sobre el cluster
# (GitOps). Se instala con Helm vendorizado a traves de Terraform en vez
# de "helm install" manual, para mantener el principio de que todo lo
# de infraestructura de P8 queda declarado en un solo lugar.
#
# Se desactivan Dex (SSO), notifications-controller y applicationSet:
# no los usamos para esta practica y el cluster es de solo 2 nodos
# e2-small, asi que conviene no gastar CPU/memoria en componentes que
# no vamos a necesitar.
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
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

  # El servidor de ArgoCD sirve HTTPS con certificado autofirmado por
  # defecto. Para esta practica accedemos vía "kubectl port-forward"
  # (sin exponerlo a internet ni gastar en un LoadBalancer aparte), asi
  # que se simplifica a HTTP interno para no lidiar con el certificado.
  set {
    name  = "configs.params.server\\.insecure"
    value = "true"
  }
}

# Argo Rollouts: controlador de despliegue progresivo (canary), para la
# Fase 5. Se instala ya desde ahora junto con ArgoCD porque es la misma
# naturaleza de "addon de cluster" gestionado por Terraform.
resource "helm_release" "argo_rollouts" {
  name             = "argo-rollouts"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-rollouts"
  namespace        = "argo-rollouts"
  create_namespace = true
}
