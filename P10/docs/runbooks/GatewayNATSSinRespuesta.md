# Runbook: GatewayNATSSinRespuesta

**Severidad:** page  
**SLO afectado:** SLO-1 disponibilidad

## Qué significa
El api-gateway publica peticiones en NATS (`svc.<servicio>.http`) y no recibe respuesta (timeout de 5 s o error de conexión) a más de 0,05 req/s durante 2 minutos. El gateway responde 504 al usuario.

## Impacto en el usuario
Las rutas atendidas por ese microservicio devuelven 504 tras 5 s de espera.

## Diagnóstico (en este orden, ≈ 3 min)
1. La etiqueta `servicio` de la alerta dice qué microservicio no contesta.
2. `kubectl -n sa-p8 get pods | findstr <servicio>` y `kubectl -n sa-p8 get pods | findstr nats` — ¿el microservicio o el broker están caídos?
3. Logs del gateway: LogQL `{service_name="api-gateway"} | msg=~"sin respuesta de.*"`.
4. Logs del microservicio: ¿se suscribió al subject? (arranque de `httpBridge`).

## Mitigación
Reiniciar el microservicio (`kubectl -n sa-p8 rollout restart deploy/<servicio>`); si es NATS, revisar el StatefulSet `sa-platform-nats` y su PVC.

## Después
Registrar en el informe de operación: hora de detección, causa, hora de recuperación y si la alerta fue útil, tardía o ruidosa.
