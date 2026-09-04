# ============================================================================
# eliminar-recursos.ps1
# Practica 6 - eliminacion de todos los recursos de nube al finalizar, tal
# como exige el enunciado (punto 9 del alcance y criterio "Gestion de
# costos y eliminacion de recursos" de la rubrica).
#
# IMPORTANTE: tomar TODAS las capturas de evidencia (docs/04-evidencias.md)
# ANTES de correr este script. Una vez eliminado el cluster no se puede
# volver a capturar evidencia sin desplegar todo de nuevo.
# ============================================================================

$ErrorActionPreference = "Continue"

$PROJECT_ID = "TU-PROJECT-ID-DE-GCP"
$REGION     = "us-central1"
$ZONE       = "us-central1-a"
$CLUSTER    = "sa-p6-cluster"
$REPO       = "sa-p6"
$NAMESPACE  = "sa-p6"

Write-Host "==> Desinstalando el release de Helm (borra Deployments, Services, etc.)"
helm uninstall sa-platform -n $NAMESPACE

Write-Host "==> Borrando el namespace (por si quedan PVCs u otros recursos sueltos)"
kubectl delete namespace $NAMESPACE

Write-Host "==> Borrando el cluster de GKE (esto es lo que realmente detiene el cobro por los nodos)"
gcloud container clusters delete $CLUSTER --zone $ZONE --project $PROJECT_ID --quiet

Write-Host "==> Borrando las imagenes del registro (opcional, Artifact Registry casi no cobra por almacenamiento, pero para dejar todo limpio)"
gcloud artifacts repositories delete $REPO --location=$REGION --project $PROJECT_ID --quiet

Write-Host "==> Verificacion final: no debe quedar ningun cluster activo"
gcloud container clusters list --project $PROJECT_ID

# Captura sugerida para docs/06-eliminacion-recursos.md: la salida de este
# script completo, y "gcloud container clusters list" mostrando la lista
# vacia al final.
