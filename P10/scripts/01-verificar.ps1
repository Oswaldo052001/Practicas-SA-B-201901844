# Paso 3 - Verificacion de punta a punta del stack de la Practica 10.
# Revisa: ArgoCD, pods, scraping de Prometheus, reglas, tablero, trazas en
# Tempo, registros en Loki y AnalysisTemplate. Imprime OK/FALLA por punto y
# guarda el resultado en P10\docs\evidencias\verificacion.txt.
. "$PSScriptRoot\_comun.ps1"
$informe = New-Object System.Collections.Generic.List[string]
function Reg($ok, $txt) { if ($ok) { Ok $txt; $informe.Add("[OK]    $txt") } else { Falla $txt; $informe.Add("[FALLA] $txt") } }

Paso "ArgoCD"
foreach ($app in "sa-platform-root","sa-platform","kube-prometheus-stack","observability-resources") {
  $estado = kubectl -n argocd get application $app -o jsonpath="{.status.sync.status}/{.status.health.status}" 2>$null
  Reg ($estado -eq "Synced/Healthy") "Application $app = $estado"
}

Paso "Pods de observabilidad"
kubectl -n $Obs get pods -o wide
foreach ($d in "loki","tempo","otel-collector","alert-sink","loadgen") {
  $listos = kubectl -n $Obs get deploy $d -o jsonpath="{.status.readyReplicas}" 2>$null
  Reg ($listos -ge 1) "Deployment $d listo ($listos)"
}
$ds = kubectl -n $Obs get ds otel-collector-logs -o jsonpath="{.status.numberReady}/{.status.desiredNumberScheduled}" 2>$null
Reg ($ds -and $ds.Split('/')[0] -eq $ds.Split('/')[1]) "DaemonSet otel-collector-logs = $ds"

Paso "Prometheus recolecta los servicios"
foreach ($s in "api-gateway","auth-service","reserva-service") {
  $arriba = Prom-Valor "sum(up{namespace=`"$Ns`",service=`"$s`"})"
  Reg ($arriba -ge 1) "scrape de ${s}: pods arriba = $arriba"
}
$rps = Prom-Valor 'sa:http_requests:rate5m'
Reg ($rps -gt 0) "regla de grabacion sa:http_requests:rate5m = $rps req/s"
$reglas = Prom-Valor 'count(ALERTS_FOR_STATE) or vector(0)'
$alertasDef = kubectl -n $Obs get prometheusrule sa-p8-slo -o jsonpath="{.metadata.name}" 2>$null
Reg ($alertasDef -eq "sa-p8-slo") "PrometheusRule sa-p8-slo cargada"
$cuentaNegocio = Prom-Valor 'sum(app_logins_total)'
Reg ($cuentaNegocio -gt 0) "metrica de negocio app_logins_total = $cuentaNegocio"

Paso "AnalysisTemplate del canary (consulta Prometheus)"
$prov = kubectl -n $Ns get analysistemplate api-gateway-canary-metrics -o jsonpath="{.spec.args[?(@.name=='prometheus-address')].value}" 2>$null
Reg ($prov -like "*kps-prometheus*") "AnalysisTemplate api-gateway-canary-metrics -> $prov"

Paso "Tempo recibe trazas"
$pod = kubectl -n $Obs get pod -l app.kubernetes.io/name=tempo -o jsonpath="{.items[0].metadata.name}"
$tr = kubectl -n $Obs exec $pod -- wget -qO- "http://localhost:3200/api/search?limit=5" 2>$null
$nTr = 0; if ($tr) { $nTr = @(($tr | ConvertFrom-Json).traces).Count }
Reg ($nTr -gt 0) "Tempo devuelve $nTr trazas recientes"

Paso "Loki recibe registros (con trace_id)"
$podL = kubectl -n $Obs get pod -l app.kubernetes.io/name=loki -o jsonpath="{.items[0].metadata.name}"
$ahoraNs = [int64]((Get-Date).ToUniversalTime() - [datetime]'1970-01-01').TotalSeconds * 1000000000
$desde = $ahoraNs - ([int64]600 * 1000000000)
$q = [uri]::EscapeDataString('{service_name="api-gateway"} | trace_id != ""')
$lk = kubectl -n $Obs exec $podL -- wget -qO- "http://localhost:3100/loki/api/v1/query_range?query=$q&limit=3&start=$desde&end=$ahoraNs" 2>$null
$nLk = 0; if ($lk) { $nLk = @(($lk | ConvertFrom-Json).data.result).Count }
Reg ($nLk -gt 0) "Loki devuelve $nLk flujos de api-gateway con trace_id en los ultimos 10 min"

Paso "Grafana"
$dash = kubectl -n $Obs get cm dashboard-operacion -o jsonpath="{.metadata.labels.grafana_dashboard}" 2>$null
Reg ($dash -eq "1") "ConfigMap del tablero con etiqueta grafana_dashboard"

$fallas = ($informe | Where-Object { $_ -like "[[]FALLA]*" }).Count
Guardar-Evidencia "verificacion.txt" ("Verificacion " + (Ahora) + "`n" + ($informe -join "`n"))
Write-Host ""
if ($fallas -eq 0) { Write-Host "TODO EN ORDEN" -ForegroundColor Green } else { Write-Host "$fallas punto(s) con FALLA - revisa arriba y avisame" -ForegroundColor Red }

