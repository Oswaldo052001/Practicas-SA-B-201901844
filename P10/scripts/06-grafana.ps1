# Abre Grafana en http://localhost:3000 (usuario admin / clave p10-observabilidad)
# y deja corriendo el port-forward hasta que pulses Ctrl+C.
# Tambien deja a mano Prometheus (9090) para ensenar consultas PromQL al auxiliar.
. "$PSScriptRoot\_comun.ps1"
Start-Process -FilePath "kubectl" -ArgumentList "-n $Obs port-forward svc/kps-prometheus 9090:9090" -WindowStyle Hidden
Start-Process "http://localhost:3000/d/sa-p10-operacion"
Write-Host "Grafana: http://localhost:3000   Prometheus: http://localhost:9090   (Ctrl+C para cerrar Grafana)"
kubectl -n $Obs port-forward svc/kps-grafana 3000:80
