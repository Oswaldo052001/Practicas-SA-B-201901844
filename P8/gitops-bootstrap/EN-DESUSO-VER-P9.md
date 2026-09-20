# Este bootstrap manual quedó en desuso a partir de la Práctica 9

`bootstrap-argocd.sh` y `application.yaml` son los que se usaron para
instalar ArgoCD/Argo Rollouts/Sealed Secrets/Kyverno a mano en la Práctica
8 (criterio "ausencia de despliegue directo": ArgoCD no podía
autoinstalarse por GitOps la primera vez, así que se hacía manualmente,
una sola vez, fuera de Terraform y fuera de CI). Se dejan intactos como
referencia histórica.

A partir de la Práctica 9, ArgoCD, Velero y Sealed Secrets se instalan
desde Terraform (`P9/terraform/argocd.tf`, `velero.tf`,
`sealed-secrets.tf`) como parte de un único `terraform apply` — ver
`P9/gitops-bootstrap/README.md`. No volver a correr `bootstrap-argocd.sh`.
