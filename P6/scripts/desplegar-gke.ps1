# ============================================================================
# desplegar-gke.ps1
# Practica 6 - Software Avanzado - USAC, carne 201901844
# Despliegue de la plataforma CineTix en un cluster de GKE.
#
# Requisitos previos instalados en esta maquina (PowerShell, Windows):
#   - Google Cloud SDK (gcloud): https://cloud.google.com/sdk/docs/install
#   - kubectl:  gcloud components install kubectl
#   - Helm 3:   https://helm.sh/docs/intro/install/  (choco install kubernetes-helm)
#   - Docker Desktop corriendo
#
# Ejecutar parado en la carpeta P6/ del repositorio:
#   cd PRACTICAS-SA-201901844\P6
#   .\scripts\desplegar-gke.ps1
#
# El script NO corre solo de punta a punta a proposito: cada bloque tiene un
# comentario "PASO N" para poder ejecutarlo por partes y tomar capturas en
# el momento correcto (ver docs/04-evidencias.md).
# ============================================================================

$ErrorActionPreference = "Stop"

# ----------------------------------------------------------------------------
# 0) Variables - AJUSTAR antes de correr
# ----------------------------------------------------------------------------
$PROJECT_ID = "cinetix-p6"      # gcloud projects list
$REGION     = "us-central1"
$ZONE       = "us-central1-a"
$CLUSTER    = "sa-p6-cluster"
$REPO       = "sa-p6"                     # nombre del repo de Artifact Registry
$NAMESPACE  = "sa-p6"
$CARNE      = "201901844"

$IMG_BASE = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO"

Write-Host "IMG_BASE = $IMG_BASE"

# ----------------------------------------------------------------------------
# PASO 1: Autenticacion y proyecto de GCP
# ----------------------------------------------------------------------------
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud auth application-default login

# ----------------------------------------------------------------------------
# PASO 2: Habilitar las APIs necesarias
# ----------------------------------------------------------------------------
gcloud services enable container.googleapis.com artifactregistry.googleapis.com

# ----------------------------------------------------------------------------
# PASO 3: Crear el registro de contenedores privado (Artifact Registry)
# Captura sugerida: consola de GCP > Artifact Registry, mostrando el repo.
# ----------------------------------------------------------------------------
gcloud artifacts repositories create $REPO `
  --repository-format=docker `
  --location=$REGION `
  --description="Imagenes privadas Practica 6 - Software Avanzado - carne $CARNE"

gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# ----------------------------------------------------------------------------
# PASO 4: Build + push de las 7 imagenes (usa los Dockerfile ya existentes
# de la Practica 5, sin reescribir la aplicacion)
# ----------------------------------------------------------------------------
Push-Location ..\P5

$servicios = @("api-gateway", "auth-service", "reserva-service", "pago-service", "notificacion-service", "cronjob-registro", "cronjob-resumen")

foreach ($s in $servicios) {
    Write-Host "==> build $s"
    docker build -t "$IMG_BASE/${s}:p6" -f "docker/$s/Dockerfile" .
}

foreach ($s in $servicios) {
    Write-Host "==> push $s"
    docker push "$IMG_BASE/${s}:p6"
}

Pop-Location

# Captura sugerida: consola de GCP > Artifact Registry > sa-p6, con las 7
# imagenes listadas (privadas, no publicas).

# ----------------------------------------------------------------------------
# PASO 5: Crear el cluster GKE administrado (2 nodos, minimo exigido por la
# rubrica; e2-medium para que el pod de pago-service (JVM) no sufra
# throttling al arrancar)
# ----------------------------------------------------------------------------
gcloud container clusters create $CLUSTER `
  --zone $ZONE `
  --num-nodes 2 `
  --machine-type e2-medium `
  --disk-size 30

gcloud container clusters get-credentials $CLUSTER --zone $ZONE

kubectl get nodes -o wide
# Captura sugerida: salida de "kubectl get nodes -o wide" (2 nodos Ready) y
# la consola de GCP > Kubernetes Engine > Clusters.

# ----------------------------------------------------------------------------
# PASO 6: Resolver dependencias de Helm (postgresql + nats)
# ----------------------------------------------------------------------------
Push-Location ..\P5\charts\sa-platform
helm dependency update
Pop-Location

# ----------------------------------------------------------------------------
# PASO 7: Secrets - NO se versiona este archivo en git
# Copiar P5/charts/sa-platform/values.example.yaml a
# P6/charts/values-secrets-gke.yaml y reemplazar los placeholders con
# credenciales reales (password de postgres, de nats, jwtSecret, etc.)
# antes de continuar con el PASO 8.
# ----------------------------------------------------------------------------
if (-not (Test-Path ".\charts\values-secrets-gke.yaml")) {
    Write-Warning "Falta charts\values-secrets-gke.yaml. Copia values.example.yaml y llena los REEMPLAZAR-* antes de seguir."
    exit 1
}

# ----------------------------------------------------------------------------
# PASO 8: helm install (namespace sa-p6, imagenes de Artifact Registry)
# ----------------------------------------------------------------------------
helm install sa-platform ..\P5\charts\sa-platform `
  -f ..\P5\charts\sa-platform\values.yaml `
  -f ..\P5\charts\sa-platform\values-prod.yaml `
  -f .\charts\values-gke.yaml `
  -f .\charts\values-secrets-gke.yaml `
  --set global.namespace=$NAMESPACE `
  --set api-gateway.image.repository="$IMG_BASE/api-gateway" --set api-gateway.image.tag=p6 `
  --set auth-service.image.repository="$IMG_BASE/auth-service" --set auth-service.image.tag=p6 `
  --set reserva-service.image.repository="$IMG_BASE/reserva-service" --set reserva-service.image.tag=p6 `
  --set pago-service.image.repository="$IMG_BASE/pago-service" --set pago-service.image.tag=p6 `
  --set notificacion-service.image.repository="$IMG_BASE/notificacion-service" --set notificacion-service.image.tag=p6 `
  --set cronjob-registro.image.repository="$IMG_BASE/cronjob-registro" --set cronjob-registro.image.tag=p6 `
  --set cronjob-resumen.image.repository="$IMG_BASE/cronjob-resumen" --set cronjob-resumen.image.tag=p6 `
  -n $NAMESPACE --create-namespace

# ----------------------------------------------------------------------------
# PASO 9: Verificacion
# ----------------------------------------------------------------------------
kubectl get pods -n $NAMESPACE -o wide
kubectl get svc -n $NAMESPACE
kubectl get pvc -n $NAMESPACE
kubectl get networkpolicy -n $NAMESPACE

Write-Host "Esperando IP publica del api-gateway (puede tardar 1-3 min)..."
kubectl get svc api-gateway -n $NAMESPACE -w
# Ctrl+C en cuanto EXTERNAL-IP deje de decir <pending>.
# Captura sugerida: "kubectl get pods -n sa-p6 -o wide" (todos Running) y
# "kubectl get svc -n sa-p6" (api-gateway con EXTERNAL-IP publica).
