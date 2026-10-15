# Paso 4 - Demostracion de reversion automatica del canary por METRICAS.
# Fallo inducido (distinto al de la P8): el api-gateway "degradado" responde
# 500 al 50 % de las peticiones /api/*. Argo Rollouts crea el canary, el
# AnalysisRun consulta Prometheus, la tasa de error supera 5 % y el Rollout
# vuelve solo a la version estable. Al final se apaga el fallo.
# Guarda la evidencia en P10\docs\evidencias\canary-reversion.txt
. "$PSScriptRoot\_comun.ps1"
$log = New-Object System.Collections.Generic.List[string]
function L($t) { $linea = "[$(Ahora)] $t"; Write-Host $linea; $log.Add($linea) }

$rollout = (kubectl -n $Ns get rollout -o name | Select-String "api-gateway" | Select-Object -First 1).ToString().Trim()
if (-not $rollout) { throw "No encontre el Rollout del api-gateway en $Ns" }
L "Rollout: $rollout"
L "Estado inicial: $(kubectl -n $Ns get $rollout -o jsonpath='{.status.phase} stable={.status.stableRS}')"

Paso "Activando el fallo (FAULT_ERROR_RATE=0.5 en api-gateway) via GitOps"
Poner-Fallo "api-gateway" "FAULT_ERROR_RATE" "0.5"
Publicar-Gitops "p10: fallo inducido en api-gateway (FAULT_ERROR_RATE=0.5) para demostrar reversion del canary"
$t0 = Get-Date
L "commit/push del fallo enviado"

Paso "Esperando el AnalysisRun (maximo 8 min)"
$abortado = $false
for ($i = 0; $i -lt 96; $i++) {
  Start-Sleep -Seconds 5
  $fase = kubectl -n $Ns get $rollout -o jsonpath='{.status.phase}'
  $abort = kubectl -n $Ns get $rollout -o jsonpath='{.status.abort}'
  $runs = kubectl -n $Ns get analysisrun --sort-by=.metadata.creationTimestamp -o custom-columns=NOMBRE:.metadata.name,FASE:.status.phase --no-headers 2>$null | Select-Object -Last 3
  Write-Host ("  {0}s  rollout={1} abort={2}" -f [int]((Get-Date) - $t0).TotalSeconds, $fase, $abort)
  if ($abort -eq "true" -or $fase -eq "Degraded") { $abortado = $true; break }
}
$seg = [int]((Get-Date) - $t0).TotalSeconds
if ($abortado) { L "REVERSION AUTOMATICA detectada a los $seg s del push (fase=$fase)" } else { L "No se detecto reversion en 8 min (fase=$fase). Revisa 'kubectl -n $Ns get analysisrun'" }

Paso "Evidencia: AnalysisRun fallido"
$ultimo = kubectl -n $Ns get analysisrun --sort-by=.metadata.creationTimestamp -o name | Select-Object -Last 1
L "AnalysisRun: $ultimo"
$detalle = kubectl -n $Ns get $ultimo -o jsonpath='{range .status.metricResults[*]}{.name}{" -> "}{.phase}{" mediciones="}{.measurements[*].value}{"\n"}{end}'
L "Resultado por metrica:`n$detalle"
$log.Add((kubectl -n $Ns get analysisrun --sort-by=.metadata.creationTimestamp | Out-String))
$log.Add((kubectl -n $Ns describe rollout ($rollout -replace '^rollout\.argoproj\.io/','') | Select-String -Pattern "Abort|Analysis|Message" | Out-String))

Paso "Apagando el fallo (vuelve a la version sana)"
Poner-Fallo "api-gateway" "FAULT_ERROR_RATE" "0"
Publicar-Gitops "p10: apagar fallo inducido en api-gateway (FAULT_ERROR_RATE=0)"
L "fallo apagado; el Rollout se re-sincroniza con la configuracion sana"
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 10
  $fase = kubectl -n $Ns get $rollout -o jsonpath='{.status.phase}'
  Write-Host "  rollout=$fase"
  if ($fase -eq "Healthy") { break }
  if ($fase -eq "Paused") { Aviso "Rollout en pausa (canary sano esperando): promover con: kubectl argo rollouts promote $($rollout -replace '^rollout\.argoproj\.io/','') -n $Ns  (o kubectl patch ... pauseConditions)"; break }
}
L "Estado final: $fase"
Guardar-Evidencia "canary-reversion.txt" ($log -join "`n")
$json = @{ canary_reversion_segundos = $seg; canary_abortado = $abortado } | ConvertTo-Json
Guardar-Evidencia "datos-canary.json" $json
