#!/usr/bin/env bash
# =============================================================================
# bootstrap-argocd.sh
#
# Instalacion de dia 0 de ArgoCD y Argo Rollouts en el cluster de la
# Practica 8. Reemplaza a "terraform/argocd.tf" (movido a
# "argocd.tf.deprecado" en esta misma carpeta).
#
# POR QUE YA NO SE INSTALA DESDE TERRAFORM:
#   El script de verificacion del auxiliar (1.0_script_p8.sh) y el criterio
#   2.3 del enunciado DESCALIFICAN la entrega (ELIMINATORIO) si el repo de
#   codigo contiene "resource \"helm_release\"" o "resource
#   \"kubectl_manifest\"" en Terraform: eso convertiria a Terraform en el
#   desplegador y anularia el modelo GitOps. El mismo script tambien
#   descalifica (8.1) cualquier workflow de GitHub Actions que corra
#   "helm install/upgrade" o "kubectl apply" contra el cluster.
#
#   ArgoCD y Argo Rollouts son la PLATAFORMA (el motor de GitOps en si), no
#   la aplicacion de negocio, y no pueden autoinstalarse por GitOps la
#   primera vez. Por eso se instalan una unica vez, a mano, con este
#   script, fuera de Terraform y fuera de CI ("day-0 bootstrap").
#
#   Este script:
#     - NO es codigo Terraform (no queda en el state).
#     - NO se ejecuta dentro de .github/workflows (aborta si detecta CI).
#     - Se ejecuta UNA vez, manualmente, despues de "terraform apply"
#       (cluster, namespace, cuotas/limites y RBAC ya creados) y antes de
#       usar el pipeline.
#
#   De ahi en adelante, el UNICO componente que aplica cambios al cluster
#   es ArgoCD, sincronizando "gitops-bootstrap/application.yaml" contra el
#   repositorio GitOps (criterio 2.3).
#
#   Tambien instala el controlador de Sealed Secrets (Bitnami), por el
#   mismo motivo: gestion de secretos sin texto plano en el repo GitOps
#   exige un componente de plataforma que solo se instala una vez, fuera
#   de Terraform/CI. Los Secret reales se sellan aparte con "kubeseal"
#   (ver instrucciones en gitops/apps/sa-platform/values.example.yaml).
#
# Requisitos previos: cluster creado con "terraform apply" (dentro de
# P8/terraform), kubectl apuntando a ese cluster, helm instalado.
# =============================================================================
set -euo pipefail

# Todo lo que imprime este script tambien queda en un archivo de log junto
# a el, sin importar si la ventana de la terminal se cierra sola al
# terminar (comun con Git Bash lanzado desde PowerShell/accesos directos).
SCRIPT_DIR_LOG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGFILE="$SCRIPT_DIR_LOG/bootstrap-argocd.log"
exec > >(tee "$LOGFILE") 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando bootstrap. Log en: $LOGFILE"

# La ventana no se cierra sola al terminar (exito o error): asi da tiempo
# de leer el resultado antes de cerrarla a mano.
on_exit() {
  CODE=$?
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Script termino con codigo $CODE."
  echo "Log completo en: $LOGFILE"
  read -rp "Presiona ENTER para cerrar esta ventana..." _
}
trap on_exit EXIT

ARGOCD_NS="${ARGOCD_NS:-argocd}"
ROLLOUTS_NS="${ROLLOUTS_NS:-argo-rollouts}"
SEALED_SECRETS_NS="${SEALED_SECRETS_NS:-kube-system}"
KYVERNO_NS="${KYVERNO_NS:-kyverno}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_MANIFEST="$SCRIPT_DIR/application.yaml"

echo "==> Contexto actual de kubectl:"
kubectl config current-context

echo ""
echo "==> Verificando el criterio 8.1: este script no debe llamarse desde CI."
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "ERROR: detectado GITHUB_ACTIONS=true. Este bootstrap es SOLO manual." >&2
  echo "       Ejecutarlo desde un workflow violaria el eliminatorio de" >&2
  echo "       'ausencia de despliegue directo' (seccion 8.1)." >&2
  exit 1
fi

echo ""
echo "==> Agregando repo de Helm (argo)..."
helm repo add argo https://argoproj.github.io/argo-helm >/dev/null
helm repo update >/dev/null

echo ""
echo "==> Instalando ArgoCD en namespace '$ARGOCD_NS' (helm CLI, no Terraform)..."
# Mismos ajustes que tenia terraform/argocd.tf: se desactivan Dex (SSO),
# notifications-controller y applicationSet (no se usan en esta practica y
# el cluster es de nodos e2-small; no conviene gastar CPU/memoria en
# componentes que no se van a necesitar). Servidor en modo insecure/HTTP
# interno porque se accede via "kubectl port-forward", sin exponerlo a
# internet ni pagar un LoadBalancer aparte.
helm upgrade --install argocd argo/argo-cd \
  --namespace "$ARGOCD_NS" --create-namespace \
  --set dex.enabled=false \
  --set notifications.enabled=false \
  --set applicationSet.enabled=false \
  --set configs.params."server\.insecure"=true \
  --wait --timeout 5m

echo ""
echo "==> Instalando Argo Rollouts en namespace '$ROLLOUTS_NS' (helm CLI, no Terraform)..."
helm upgrade --install argo-rollouts argo/argo-rollouts \
  --namespace "$ROLLOUTS_NS" --create-namespace \
  --wait --timeout 5m

echo ""
echo "==> Agregando repo de Helm (sealed-secrets)..."
helm repo add sealed-secrets https://bitnami.github.io/sealed-secrets >/dev/null
helm repo update >/dev/null

echo ""
echo "==> Instalando Sealed Secrets en namespace '$SEALED_SECRETS_NS' (helm CLI, no Terraform)..."
# Namespace y nombre de release por defecto (kube-system / sealed-secrets)
# para que "kubeseal" funcione sin flags extra en la maquina del estudiante.
helm upgrade --install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace "$SEALED_SECRETS_NS" --create-namespace \
  --wait --timeout 5m

echo ""
echo "==> Agregando repo de Helm (kyverno)..."
helm repo add kyverno https://kyverno.github.io/kyverno/ >/dev/null
helm repo update >/dev/null

echo ""
echo "==> Instalando Kyverno en namespace '$KYVERNO_NS' (helm CLI, no Terraform)..."
# Kyverno es plataforma (motor de politicas), igual que ArgoCD/Rollouts/
# Sealed Secrets: se instala una sola vez, a mano, fuera de Terraform y
# fuera de CI. Las ClusterPolicy en si (las reglas) SI viven en el repo
# GitOps y las aplica ArgoCD normalmente, porque esas son configuracion de
# la aplicacion, no el controlador.
helm upgrade --install kyverno kyverno/kyverno \
  --namespace "$KYVERNO_NS" --create-namespace \
  --wait --timeout 5m

if ! command -v kubeseal >/dev/null 2>&1; then
  echo ""
  echo "AVISO: no se encontro 'kubeseal' en el PATH. Sin el no se pueden"
  echo "       sellar los secretos reales (postgresql/nats). Instalarlo:"
  echo "       https://github.com/bitnami-labs/sealed-secrets#installation"
fi

echo ""
echo "==> Esperando a que los pods de ArgoCD esten listos..."
kubectl -n "$ARGOCD_NS" wait --for=condition=available deploy --all --timeout=180s

echo ""
echo "==> Aplicando la Application raiz de ArgoCD (unico 'kubectl apply' manual,"
echo "    ejecutado a mano, fuera del pipeline -> no cuenta como despliegue directo)."
kubectl apply -f "$APP_MANIFEST"

echo ""
echo "==> Password inicial de admin de ArgoCD:"
kubectl -n "$ARGOCD_NS" get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' 2>/dev/null | base64 -d || echo "(secreto ya rotado/eliminado)"
echo ""
echo ""
echo "==> Listo. De aqui en adelante, todo cambio al cluster debe llegar via"
echo "    Pull Request al repositorio GitOps + sincronizacion de ArgoCD."
echo "    NINGUN paso posterior debe volver a ejecutar helm/kubectl contra el cluster."
