# Paso 5 - Recorrido SINTOMA -> CAUSA, cronometrado.
# Fallo inducido (base de datos "degradada" detras de reserva-service):
#   FAULT_DB_DELAY_MS=1500 (pg_sleep dentro de Postgres) y FAULT_ERROR_RATE=0.5.
# Los usuarios ven lentitud y errores en reservas. Este script:
#   1. aplica el fallo por GitOps y arranca el cronometro,
#   2. mide cuando el fallo se nota en las metricas y cuando se dispara la alerta,
#   3. te deja listos los 3 saltos para encontrar la causa (alerta -> traza -> log),
#   4. espera tu ENTER al encontrar la causa y registra el tiempo total,
#   5. apaga el fallo y mide el tiempo de recuperacion.
# Datos para el informe: P10\docs\evidencias\sintoma-causa.txt y datos-sintoma.json
. "$PSScriptRoot\_comun.ps1"
$log = New-Object System.Collections.Generic.List[string]
function L($t) { $linea = "[$(Ahora)] $t"; Write-Host $linea; $log.Add($linea) }

Paso "Preparando Grafana en http://localhost:3000 (usuario admin / clave p10-observabilidad)"
$pf = Start-Process -FilePath "kubectl" -ArgumentList "-n $Obs port-forward svc/kps-grafana 3000:80" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000/d/sa-p10-operacion"

Read-Host "Con el tablero abierto, pulsa ENTER para inyectar el fallo"
Paso "Inyectando fallo en reserva-service via GitOps"
Poner-Fallo "reserva-service" "FAULT_DB_DELAY_MS" "1500"
Poner-Fallo "reserva-service" "FAULT_ERROR_RATE" "0.5"
Publicar-Gitops "p10: fallo inducido en reserva-service (BD lenta + errores) para el recorrido sintoma-causa"
$t0 = Get-Date
L "T0 fallo publicado en GitOps"

Paso "Esperando que el fallo llegue a los pods y se note en las metricas"
$tSintoma = $null; $tAlerta = $null
for ($i = 0; $i -lt 120; $i++) {
  Start-Sleep -Seconds 5
  $err = Prom-Valor 'sa:http_error_ratio:rate1m'
  if (-not $tSintoma -and $err -gt 0.10) { $tSintoma = Get-Date; L ("SINTOMA visible en metricas: {0:P1} de errores 5xx ({1}s tras T0)" -f $err, [int]($tSintoma - $t0).TotalSeconds) }
  $firing = Prom-Valor 'count(ALERTS{alertstate="firing",alertname="SLODisponibilidadQuemaRapida"})'
  if ($firing -ge 1) { $tAlerta = Get-Date; L ("ALERTA SLODisponibilidadQuemaRapida EN FUEGO ({0}s tras T0)" -f [int]($tAlerta - $t0).TotalSeconds); break }
}
if (-not $tAlerta) { Aviso "La alerta no se disparo en 10 min: revisa con 01-verificar.ps1"; }

Paso "Alertmanager entrego la alerta al receptor"
kubectl -n $Obs logs deploy/alert-sink --tail=3

Paso "Un trace_id real de una peticion con error (para empezar por la traza)"
$podL = kubectl -n $Obs get pod -l app.kubernetes.io/name=loki -o jsonpath="{.items[0].metadata.name}"
$ahora = [int64]((Get-Date).ToUniversalTime() - [datetime]'1970-01-01').TotalSeconds * 1000000000
$q = [uri]::EscapeDataString('{service_name="api-gateway"} | level="error" | trace_id != ""')
$res = kubectl -n $Obs exec $podL -- wget -qO- "http://localhost:3100/loki/api/v1/query_range?query=$q&limit=1&start=$($ahora - 300*1000000000)&end=$ahora" 2>$null
if ($res) {
  $linea = (($res | ConvertFrom-Json).data.result | Select-Object -First 1).values[0][1]
  Write-Host "  linea de log: $linea"
}
Write-Host ""
Write-Host "RECORRIDO EN GRAFANA (el cronometro sigue corriendo):" -ForegroundColor Yellow
Write-Host "  1. Tablero 'Operacion SA P10': la alerta (anotacion roja) y el panel de errores por ruta -> /api/reservas"
Write-Host "  2. Panel de trazas (TraceQL, status=error) -> abre una traza: el span 'pg.query'/'SELECT pg_sleep' de reserva-service dura ~1.5 s"
Write-Host "  3. Desde esa traza, boton 'Logs' -> Loki: el registro 'fallo inyectado: la base reserva_db no respondio...' con el mismo trace_id"
Read-Host "Cuando hayas identificado la causa (BD lenta/errores en reserva-service), pulsa ENTER"
$tCausa = Get-Date
L ("CAUSA IDENTIFICADA: {0}s desde la alerta, {1}s desde T0" -f $(if ($tAlerta) { [int]($tCausa - $tAlerta).TotalSeconds } else { -1 }), [int]($tCausa - $t0).TotalSeconds)

# Que alertas estaban en fuego cuando se encontro la causa (para el campo "alerta faltante/sobrante").
$enFuego = Prom 'ALERTS{alertstate="firing"}'
$nombresAlertas = @()
if ($enFuego) { $nombresAlertas = @($enFuego.data.result | ForEach-Object { $_.metric.alertname } | Sort-Object -Unique) }
L ("Alertas en fuego al identificar la causa: " + ($nombresAlertas -join ", "))

Paso "Recuperacion: apagando el fallo"
Poner-Fallo "reserva-service" "FAULT_DB_DELAY_MS" "0"
Poner-Fallo "reserva-service" "FAULT_ERROR_RATE" "0"
Publicar-Gitops "p10: apagar fallo inducido en reserva-service"
$tRec0 = Get-Date
L "T1 fix publicado (revert del fallo)"
$tRec = $null
for ($i = 0; $i -lt 120; $i++) {
  Start-Sleep -Seconds 5
  $err = Prom-Valor 'sa:http_error_ratio:rate1m'
  Write-Host ("  error 1m = {0}" -f $err)
  if ($err -ne $null -and $err -lt 0.01) { $tRec = Get-Date; break }
}
if ($tRec) { L ("RECUPERADO: error < 1 % a los {0}s del fix ({1}s desde T0)" -f [int]($tRec - $tRec0).TotalSeconds, [int]($tRec - $t0).TotalSeconds) }
Stop-Process -Id $pf.Id -ErrorAction SilentlyContinue

Guardar-Evidencia "sintoma-causa.txt" ($log -join "`n")
$datos = [ordered]@{
  t0 = $t0.ToString("yyyy-MM-dd HH:mm:ss")
  deteccion_metricas_s = $(if ($tSintoma) { [int]($tSintoma - $t0).TotalSeconds } else { $null })
  deteccion_alerta_s   = $(if ($tAlerta)  { [int]($tAlerta - $t0).TotalSeconds }  else { $null })
  alerta_a_causa_s     = $(if ($tAlerta)  { [int]($tCausa - $tAlerta).TotalSeconds } else { $null })
  causa_total_s        = [int]($tCausa - $t0).TotalSeconds
  recuperacion_s       = $(if ($tRec) { [int]($tRec - $tRec0).TotalSeconds } else { $null })
  alertas_disparadas   = ($nombresAlertas -join ", ")
}
Guardar-Evidencia "datos-sintoma.json" ($datos | ConvertTo-Json)
