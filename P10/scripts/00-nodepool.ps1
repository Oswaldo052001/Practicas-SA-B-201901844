# Paso 0 - Crea el pool de nodos "obs-pool" (1 x e2-standard-2) donde corre el
# stack de observabilidad. El cluster de la P9 (4 x e2-small, requests casi
# llenos por el ResourceQuota) no tiene espacio para Prometheus+Grafana+Loki+Tempo.
# Costo aproximado: US$1.6 por dia. Se elimina con el cluster al terminar.
# Es idempotente: si ya existe, no hace nada.
. "$PSScriptRoot\_comun.ps1"

Paso "Credenciales del cluster"
gcloud container clusters get-credentials sa-p8-cluster --zone us-central1-c --project cinetix-p6

Paso "Pool obs-pool"
$existe = gcloud container node-pools list --cluster sa-p8-cluster --zone us-central1-c --project cinetix-p6 --format="value(name)" | Select-String -SimpleMatch "obs-pool"
if ($existe) {
  Ok "obs-pool ya existe"
} else {
  gcloud container node-pools create obs-pool --cluster sa-p8-cluster --zone us-central1-c --project cinetix-p6 `
    --machine-type e2-standard-2 --num-nodes 1 --disk-size 30 --disk-type pd-standard
}
kubectl get nodes -L cloud.google.com/gke-nodepool
