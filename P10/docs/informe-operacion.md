# Informe de operación — Práctica 10

Software Avanzado, USAC, Sección B — carné 201901844. Prueba ejecutada el 2026-10-15 22:11:29.
Evidencia cruda: `docs/evidencias/` (`sintoma-causa.txt`, `canary-reversion.txt`, `verificacion.txt`).

## 1. SLO

Medidos en el api-gateway sobre `/api/*`, ventana de 30 días (detalle y justificación en [`slo.md`](slo.md)):

- **SLO-1 Disponibilidad:** 99 % de peticiones sin 5xx. Presupuesto de error: 1 %.
- **SLO-2 Latencia:** 99 % de peticiones en menos de 2 s.

Alertas por quema de presupuesto: rápida (≥ 10x en 5 min), lenta (≥ 3x en 1 h), latencia, servicio sin métricas y NATS sin respuesta.

## 2. Fallo inducido

Dos fallos, ambos activados por GitOps (`values-p10-faults.yaml`, sin tocar el clúster a mano) y distintos al de la P8 (allí se rompió el endpoint `/ready-check`):

- **Recorrido síntoma → causa:** base de datos "degradada" detrás de `reserva-service`: cada operación espera 1,5 s dentro de PostgreSQL (`pg_sleep`) y falla el 50 % de las veces (503).
- **Canary:** `api-gateway` degradado que responde 500 al 50 % del tráfico real.

## 3. Tiempo de detección

- El síntoma (> 10 % de errores 5xx) fue visible en métricas a los **0 min 07 s** de publicado el fallo.
- La alerta `SLODisponibilidadQuemaRapida` pasó a *firing* a los **0 min 08 s** y Alertmanager la entregó al receptor de alertas.

(Incluye el tiempo de sincronización de ArgoCD y de arranque del pod: el reloj arranca en el `git push`.)

## 4. Recorrido hasta la causa

Desde la alerta hasta la causa pasaron **3 min 53 s** (4 min 01 s desde el `git push`):

1. **Alerta** → tablero *Operación SA P10*: el panel de errores por ruta mostró que el 5xx se concentraba en `/api/reservas`.
2. **Traza** → panel TraceQL (`status = error`): una traza de `api-gateway` → `NATS request svc.reserva-service.http` → `reserva-service`, con el span de PostgreSQL (`SELECT pg_sleep`) de ≈ 1,5 s.
3. **Log** → desde esa traza, el enlace a Loki con el mismo `trace_id`: *"fallo inyectado: la base reserva_db no respondió a tiempo"*.

Causa: la base de datos de reservas lenta y fallando; el resto de los servicios sanos.

## 5. Tiempo de recuperación

Revertido el fallo en GitOps, el error volvió a menos de 1 % a los **2 min 57 s** del `git push` de la corrección.

Canary: con el gateway defectuoso, Argo Rollouts abortó el despliegue y volvió a la versión estable por sí solo a los **2 min 16 s** del `git push`, sin intervención humana (AnalysisRun fallido por tasa de error > 5 %).

## 6. Alerta faltante o sobrante

Alertas en fuego al identificar la causa: **GatewayNATSSinRespuesta, SLODisponibilidadQuemaLenta, SLODisponibilidadQuemaRapida**.

- **Sobrante:** ninguna alerta ruidosa en la prueba; las alertas de quema usan dos ventanas (larga y corta) precisamente para no disparar por picos ya terminados.
- **Faltante:** no hay alerta por *latencia de la base de datos* en sí. Con 1,5 s por consulta las peticiones siguen por debajo del umbral de 2 s del SLO-2, así que `SLOLatenciaAlta` no habría saltado; el problema sólo se notó por los errores. Mejora propuesta: un histograma con la duración de las consultas a PostgreSQL y una alerta sobre su p95 (p. ej. > 1 s durante 5 min), para detectar la degradación antes de que haya errores.

