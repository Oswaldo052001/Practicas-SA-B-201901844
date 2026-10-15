# Runbook: SLODisponibilidadQuemaRapida

**Severidad:** page (despierta a quien esté de guardia)  
**SLO afectado:** SLO-1 disponibilidad (99 %, 30 días)

## Qué significa
Más del 10 % de las peticiones `/api/*` del api-gateway terminan en 5xx, medido en 5 min y confirmado en el último minuto. A este ritmo el presupuesto de error de 30 días se agota en menos de 3 días.

## Impacto en el usuario
Una de cada diez acciones (login, reserva, consulta) falla con error del servidor.

## Diagnóstico (en este orden, ≈ 3 min)
1. Abrir el tablero *Operación SA P10* (`http://localhost:3000/d/sa-p10-operacion` con `06-grafana.ps1`). Panel **Errores por ruta**: ¿qué ruta concentra los 5xx? (`/api/auth`, `/api/reservas`…).
2. Panel **Gateway → microservicio por NATS**: si hay `no-ok/s` para un servicio, el problema está en ese servicio o en NATS; si no, el gateway mismo está fallando.
3. Panel **Canary por hash**: si los 5xx se concentran en un `rollouts_pod_template_hash` nuevo, es un despliegue defectuoso (el AnalysisRun debería abortarlo solo; verificar `kubectl -n sa-p8 get analysisrun`).
4. Panel **Trazas con error** (TraceQL): abrir una traza, ver qué span tiene `status=error` y su duración.
5. Desde la traza, botón **Logs** → Loki con el mismo `trace_id`: el mensaje del registro indica la causa (p. ej. `fallo inyectado: la base reserva_db no respondió`).

## Mitigación
- Si es un despliegue nuevo: `git revert` del último cambio en el repo GitOps (o poner la tag anterior); ArgoCD revierte.
- Si es la base de datos: `kubectl -n sa-p8 get pods`, `kubectl -n sa-p8 logs sa-platform-postgresql-0`; reiniciar el pod sólo si está colgado.
- Si es una variable de fallo inducido: `P10/scripts/04-restaurar.ps1`.

## Después
Registrar en el informe de operación: hora de detección, causa, hora de recuperación y si la alerta fue útil, tardía o ruidosa.
