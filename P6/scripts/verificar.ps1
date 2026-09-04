# ============================================================================
# verificar.ps1
# Prueba el sistema desde INTERNET (fuera del cluster), como pide el
# enunciado ("verificar el funcionamiento desde fuera del cluster, con
# evidencia de peticiones realizadas desde internet").
# ============================================================================

$NAMESPACE = "sa-p6"

$svc = kubectl get svc api-gateway -n $NAMESPACE -o json | ConvertFrom-Json
$ip = $svc.status.loadBalancer.ingress[0].ip
Write-Host "IP publica del api-gateway: $ip"

Write-Host "`n== /health =="
curl.exe "http://$ip:3000/health"

Write-Host "`n== registro de usuario ==" 
curl.exe -X POST "http://$ip:3000/api/auth/registro" `
  -H "Content-Type: application/json" `
  -d '{"correo":"evidencia-p6@example.com","password":"ClaveSegura123"}'

Write-Host "`n== login ==" 
curl.exe -X POST "http://$ip:3000/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"correo":"evidencia-p6@example.com","password":"ClaveSegura123"}'

Write-Host "`n== crear reserva (GraphQL via gateway) =="
curl.exe -X POST "http://$ip:3000/api/graphql-reservas" `
  -H "Content-Type: application/json" `
  -d '{"query":"mutation { crearReserva(usuarioId: 1, funcionId: 1, asientos: 2) { id estado } }"}'

Write-Host "`n== crear pago (dispara el evento asincrono via NATS JetStream) =="
curl.exe -X POST "http://$ip:3000/api/pagos" `
  -H "Content-Type: application/json" `
  -d '{"reservaId":1,"monto":50.00}'

Start-Sleep -Seconds 3

Write-Host "`n== notificaciones generadas por el evento asincrono anterior =="
curl.exe "http://$ip:3000/api/notificaciones"

# Captura sugerida para docs/04-evidencias.md: esta consola completa (con
# la IP publica visible en los comandos y las respuestas 200/201 con los
# datos creados), ademas de abrir "http://<IP>:3000/health" desde el
# navegador para mostrar que responde desde fuera del cluster.
