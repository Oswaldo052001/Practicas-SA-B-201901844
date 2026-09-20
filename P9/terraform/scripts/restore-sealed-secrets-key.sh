#!/usr/bin/env bash
# =============================================================================
# restore-sealed-secrets-key.sh
#
# Continuidad de los secretos (criterio 2.4 / enunciado 3.2). El problema
# que resuelve (enunciado, seccion 3.1):
#   "Los secretos estan cifrados en el repositorio, pero la llave que los
#    descifra vive UNICAMENTE dentro del cluster: si el cluster se pierde,
#    el repositorio queda lleno de contenido ilegible."
#
# Sealed Secrets guarda su llave privada como un Secret normal de
# Kubernetes (tipo kubernetes.io/tls) en el namespace del controlador,
# etiquetado "sealedsecrets.bitnami.com/sealed-secrets-key=active". Si ese
# Secret se respalda con Velero ANTES de perder el cluster y se restaura
# ANTES de que el controlador arranque por primera vez tras la
# reconstruccion, el controlador reutiliza la misma llave en vez de generar
# una nueva al azar - y los SealedSecret ya existentes en el repo GitOps
# (templates/sealed-secrets.yaml) se pueden volver a descifrar sin volver
# a sellarlos.
#
# Por eso el ORDEN importa y por eso este script corre entre
# "helm_release.velero" y "helm_release.sealed_secrets" en Terraform (ver
# sealed-secrets.tf): la llave debe existir en el namespace ANTES de que el
# Helm release del controlador lo cree.
#
# Es intencional que este script NO falle el "terraform apply" si todavia
# no existe ningun respaldo (primera vez que se hace bootstrap: el
# controlador simplemente genera una llave nueva, como siempre).
# =============================================================================
set -uo pipefail

NAMESPACE="${SEALED_SECRETS_NAMESPACE:-kube-system}"
SCHEDULE_NAME="${SEALED_SECRETS_SCHEDULE_NAME:-sealed-secrets-key-backup}"

echo "==> Buscando el respaldo mas reciente del schedule '$SCHEDULE_NAME'..."

LATEST_BACKUP="$(velero backup get --selector "velero.io/schedule-name=${SCHEDULE_NAME}" -o json 2>/dev/null \
  | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
items = data.get("items", [])
completed = [i for i in items if i.get("status", {}).get("phase") == "Completed"]
if not completed:
    sys.exit(0)
completed.sort(key=lambda i: i["metadata"]["creationTimestamp"], reverse=True)
print(completed[0]["metadata"]["name"])
' 2>/dev/null)"

if [ -z "${LATEST_BACKUP:-}" ]; then
  echo "AVISO: no se encontro ningun respaldo completado de '$SCHEDULE_NAME'."
  echo "       Esto es normal en el PRIMER bootstrap del cluster (todavia no"
  echo "       hay respaldos). El controlador de Sealed Secrets va a generar"
  echo "       una llave nueva. A partir de aqui, el Schedule de Velero"
  echo "       (repo GitOps: bootstrap/velero-resources) se encarga de"
  echo "       respaldarla para la proxima reconstruccion."
  exit 0
fi

echo "==> Respaldo encontrado: $LATEST_BACKUP. Restaurando la llave a '$NAMESPACE'..."

RESTORE_NAME="sealed-secrets-key-restore-$(date +%s)"

if ! velero restore create "$RESTORE_NAME" \
  --from-backup "$LATEST_BACKUP" \
  --namespace-mappings "${NAMESPACE}:${NAMESPACE}" \
  --wait; then
  echo "AVISO: la restauracion '$RESTORE_NAME' fallo o no completo a tiempo."
  echo "       Revisar a mano con: velero restore describe $RESTORE_NAME --details"
  echo "       No se detiene el bootstrap por esto: el controlador puede"
  echo "       arrancar con una llave nueva, pero los secretos sellados"
  echo "       anteriores NO se podran descifrar hasta resolverlo a mano."
  exit 0
fi

PHASE="$(velero restore get "$RESTORE_NAME" -o json | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",{}).get("phase","Unknown"))' 2>/dev/null)"
echo "==> Restauracion '$RESTORE_NAME' termino con fase: $PHASE"

if [ "$PHASE" != "Completed" ] && [ "$PHASE" != "PartiallyFailed" ]; then
  echo "AVISO: fase inesperada ($PHASE). Revisar a mano antes de confiar en"
  echo "       que la llave se restauro correctamente."
fi

exit 0
