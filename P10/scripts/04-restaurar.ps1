# Seguro: apaga TODOS los fallos inducidos (api-gateway y reserva-service) por GitOps.
# Usalo si un demo se interrumpe a medias. Es idempotente.
. "$PSScriptRoot\_comun.ps1"
Poner-Fallo "api-gateway" "FAULT_ERROR_RATE" "0"
Poner-Fallo "api-gateway" "FAULT_LATENCY_MS" "0"
Poner-Fallo "reserva-service" "FAULT_ERROR_RATE" "0"
Poner-Fallo "reserva-service" "FAULT_DB_DELAY_MS" "0"
Push-Location $script:RepoGitops
$cambios = git status --porcelain apps/sa-platform/values-p10-faults.yaml
Pop-Location
if ($cambios) { Publicar-Gitops "p10: restaurar fallos inducidos a 0"; Ok "fallos apagados y publicados" } else { Ok "ya estaban apagados" }
