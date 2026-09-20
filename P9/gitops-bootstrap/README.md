# P9/gitops-bootstrap

Punto de entrada del bootstrap de día cero (tabla 4.1, "Punto de entrada
del bootstrap"): **`terraform apply` dentro de `P9/terraform/`**.

Este archivo (`root-application.yaml`) ya no se aplica a mano: lo aplica
Terraform automáticamente como último paso del `apply`
(`P9/terraform/bootstrap-app.tf`). Se deja documentado aquí porque es el
contenido exacto de lo que Terraform aplica, y porque `P8/gitops-bootstrap/`
sigue existiendo como referencia histórica de cómo se hacía en la Práctica
8 (instalación manual con `bootstrap-argocd.sh`) — ese script queda
**en desuso** a partir de la Práctica 9: ya no se ejecuta.
