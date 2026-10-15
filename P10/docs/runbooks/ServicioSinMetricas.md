# Runbook: ServicioSinMetricas

**Severidad:** page  
**SLO afectado:** SLO-1 y SLO-2 (sin datos no hay SLO)

## Qué significa
Prometheus no puede raspar el puerto 9464 de un pod de api-gateway, auth-service o reserva-service durante 2 minutos: el pod está caído, reiniciando, o una NetworkPolicy bloquea el scrape.

## Impacto en el usuario
Si el pod está caído, ese servicio no atiende; si sólo falla el scrape, no hay impacto pero estamos ciegos.

## Diagnóstico (en este orden, ≈ 3 min)
1. `kubectl -n sa-p8 get pods` — ¿`CrashLoopBackOff`, `OOMKilled`, `Pending`?
2. `kubectl -n sa-p8 describe pod <pod>` — eventos (OOM, probes, falta de recursos por el ResourceQuota).
3. `kubectl -n sa-p8 logs <pod> --previous` — último error antes del reinicio.
4. Si el pod está sano: `kubectl -n sa-p8 get networkpolicy` — debe existir `allow-observability-ingress`.

## Mitigación
Corregir el despliegue (recursos, imagen) por GitOps; si hay OOM, subir `limits.memory` en `values-p10.yaml`.

## Después
Registrar en el informe de operación: hora de detección, causa, hora de recuperación y si la alerta fue útil, tardía o ruidosa.
