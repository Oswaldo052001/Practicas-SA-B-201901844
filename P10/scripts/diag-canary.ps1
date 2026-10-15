# Diagnostico del canary de api-gateway: reintenta el rollout abortado y, cada
# 20 s durante ~4 min, muestra (1) el pod canary, (2) si Prometheus lo raspa,
# (3) si el pod sirve /metrics por si mismo y (4) el estado del rollout.
function Q($q) {
  $e = [uri]::EscapeDataString($q)
  $r = kubectl -n observability exec prometheus-kps-prometheus-0 -c prometheus -- wget -qO- "http://localhost:9090/api/v1/query?query=$e" 2>$null | ConvertFrom-Json
  if (-not $r.data.result) { "   (sin resultados)"; return }
  $r.data.result | ForEach-Object { "   " + ($_.metric | ConvertTo-Json -Compress) + " => " + $_.value[1] }
}
Set-Content -Path "$env:TEMP\retry.json" -Value '{"status":{"abort":false}}' -Encoding ascii
kubectl -n sa-p8 patch rollout api-gateway --subresource=status --type merge --patch-file "$env:TEMP\retry.json"
1..12 | ForEach-Object {
  Write-Host ""; Write-Host ("===== " + (Get-Date -Format HH:mm:ss) + " =====") -ForegroundColor Cyan
  $pods = (kubectl -n sa-p8 get pods -l app.kubernetes.io/name=api-gateway -o json | ConvertFrom-Json).items
  $canary = $pods | Where-Object { $_.spec.containers[0].image -like "*p10-v1.0.0" } | Select-Object -First 1
  if ($canary) {
    $ip = $canary.status.podIP
    Write-Host ("canary: " + $canary.metadata.name + " ip=" + $ip + " fase=" + $canary.status.phase + " hash=" + $canary.metadata.labels.'rollouts-pod-template-hash')
    Write-Host "labels del pod:"; $canary.metadata.labels | ConvertTo-Json -Compress
    Write-Host "up del gateway en Prometheus:"
    Q 'up{service="api-gateway"}'
    Write-Host "series app_http_requests_total del gateway:"
    Q 'count by (pod, rollouts_pod_template_hash) (app_http_requests_total{service="api-gateway"})'
    if ($ip) {
      Write-Host "scrape directo desde el pod de Prometheus a ${ip}:9464 :"
      kubectl -n observability exec prometheus-kps-prometheus-0 -c prometheus -- wget -qO- -T 5 "http://${ip}:9464/metrics" 2>&1 | Select-String "app_http_requests_total" | Select-Object -First 3
    }
    Write-Host "peticiones que ha recibido el canary (lineas http_request en su log):"
    (kubectl -n sa-p8 logs $canary.metadata.name --tail=2000 2>$null | Select-String "http_request" | Measure-Object).Count
  } else { Write-Host "(aun no hay pod canary con p10)" }
  kubectl -n sa-p8 get rollout api-gateway -o custom-columns=FASE:.status.phase,PASO:.status.currentStepIndex
  kubectl -n sa-p8 get analysisrun
  Start-Sleep -Seconds 20
}
