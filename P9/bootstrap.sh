#!/usr/bin/env bash
# =============================================================================
#  P9 - Punto de entrada unico del bootstrap.
#
#  Reconstruye la plataforma completa desde cero con UN solo comando:
#     ./P9/bootstrap.sh
#
#  Capa de infraestructura y plataforma (Terraform): cluster GKE, namespaces,
#  Velero, Sealed Secrets, ArgoCD y la aplicacion raiz (app-of-apps).
#  Capa de aplicaciones (GitOps): a partir de la aplicacion raiz, ArgoCD
#  crea y sincroniza el resto. Ver docs/diagrama-bootstrap.md.
#
#  Requiere: terraform, gcloud (sesion iniciada) y kubectl.
# =============================================================================
set -euo pipefail

PROYECTO="cinetix-p6"
ZONA="us-central1-c"
CLUSTER="sa-p8-cluster"

cd "$(dirname "$0")/terraform"

terraform init
terraform apply

# El kubeconfig anterior apunta al cluster destruido: se regenera apenas existe
# el nuevo (si no, kubectl da timeout y luego error x509).
gcloud container clusters get-credentials "$CLUSTER" --zone "$ZONA" --project "$PROYECTO"

kubectl -n argocd get applications
