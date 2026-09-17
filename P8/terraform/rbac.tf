# Cuenta de servicio y rol de menor privilegio para el componente que
# va a aplicar cambios dentro del namespace (ArgoCD, una vez instalado
# en la Fase 3). Se deja provisionado desde ya junto con el resto de la
# infraestructura del cluster.

resource "kubernetes_service_account" "argocd_deployer" {
  metadata {
    name      = "argocd-deployer"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
}

resource "kubernetes_role" "sa_p8_deployer_role" {
  metadata {
    name      = "sa-p8-deployer"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }

  rule {
    api_groups = ["", "apps"]
    resources  = ["deployments", "services", "configmaps", "pods", "replicasets", "secrets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }

  rule {
    api_groups = ["argoproj.io"]
    resources  = ["rollouts", "analysisruns", "analysistemplates"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
}

resource "kubernetes_role_binding" "sa_p8_deployer_binding" {
  metadata {
    name      = "sa-p8-deployer-binding"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.sa_p8_deployer_role.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.argocd_deployer.metadata[0].name
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
}
