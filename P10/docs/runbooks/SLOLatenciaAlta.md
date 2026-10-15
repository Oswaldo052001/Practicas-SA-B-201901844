# Runbook: SLOLatenciaAlta

**Severidad:** page  
**SLO afectado:** SLO-2 latencia (99 % < 2 s, 30 días)

## Qué significa
Más del 5 % de las peticiones `/api/*` tarda más de 2 segundos durante al menos 2 minutos (el SLO tolera 1 %).

## Impacto en el usuario
La aplicación responde, pero lenta: las reservas se sienten colgadas.

## Diagnóstico (en este orden, ≈ 3 min)
1. Tablero → **Latencia p50/p95/p99**: ¿sube todo o sólo la cola (p99)?
2. **NATS p95 por servicio**: indica qué microservicio es lento.
3. Panel de **trazas**: TraceQL `{ resource.service.name = "reserva-service" && span.db.system = "postgresql" && duration > 1s }` — un span de Postgres largo señala la base de datos.
4. **Saturación**: event loop p99 alto → proceso saturado de CPU; pool con `waiting` → faltan conexiones.

## Mitigación
- Base lenta: revisar consultas bloqueadas (`SELECT * FROM pg_stat_activity`).
- Servicio saturado: más réplicas/CPU por GitOps.
- Fallo inducido: `04-restaurar.ps1`.

## Después
Registrar en el informe de operación: hora de detección, causa, hora de recuperación y si la alerta fue útil, tardía o ruidosa.
