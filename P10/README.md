# Práctica 10 — Observabilidad y operación (del síntoma a la causa)

Universidad San Carlos de Guatemala, Software Avanzado, Sección B, carné
201901844. Esta práctica se califica junto con la P8 (entrega progresiva) y
la P9 (continuidad operativa), cuyo diseño y despliegue **no se modificaron**
salvo lo estrictamente necesario para observar y decidir el canary por
métricas, más dos correcciones menores de P9 hechas durante esta práctica
(ver «Cambios sobre P8/P9» al final).

## Qué se construyó

- **Instrumentación con OpenTelemetry (SDK) en 3 microservicios** —
  `api-gateway`, `auth-service`, `reserva-service` (código en [`src/`](src/)).
  Las tres señales: trazas (OTLP → Collector → Tempo), métricas (endpoint
  `/metrics` → Prometheus) y registros JSON con `trace_id` (→ Collector →
  Loki). El contexto de traza **cruza NATS** (header `traceparent` dentro del
  mensaje) y el gateway devuelve el `trace_id` en `x-trace-id`.
- **Stack desplegado por GitOps (ArgoCD), nada manual:** kube-prometheus-stack
  (Prometheus, Alertmanager, Grafana), Loki, Tempo, dos OpenTelemetry
  Collector y un generador de carga, en el namespace `observability`.
- **Canary decidido por métricas reales:** el `AnalysisTemplate` consulta
  Prometheus (tasa de error y p95 sólo de los pods canary); si falla, Argo
  Rollouts revierte solo.
- **2 SLO** con *recording rules*, **5 alertas con runbook** (3 por quema del
  presupuesto de error — *burn rate* — y 2 operativas), **tablero** de las
  cuatro señales de oro y un **recorrido síntoma → causa** cronometrado.

Diagrama del flujo: [`docs/diagrama-telemetria.md`](docs/diagrama-telemetria.md).

## 4.1 Tabla de enlaces obligatoria

| Ítem | Enlace o dato requerido |
|---|---|
| Repositorio de código | https://github.com/Oswaldo052001/Practicas-SA-B-201901844 (carpeta `P10`) |
| Repositorio GitOps | https://github.com/Oswaldo052001/Practicas-SA-B-201901844-gitops |
| Pipeline de imágenes instrumentadas | [`.github/workflows/p10-cicd.yml`](../.github/workflows/p10-cicd.yml) — ejecuciones: https://github.com/Oswaldo052001/Practicas-SA-B-201901844/actions/workflows/p10-cicd.yml (tag `p10-v1.0.0`) |
| Servicios instrumentados y namespace | `api-gateway`, `auth-service`, `reserva-service` en el namespace `sa-p8` (clúster `sa-p8-cluster`, proyecto GCP `cinetix-p6`) |
| Instrumentación (código) | [`src/api-gateway/src/observability.ts`](src/api-gateway/src/observability.ts), [`src/auth-service/src/observability.ts`](src/auth-service/src/observability.ts), [`src/reserva-service/src/observability.ts`](src/reserva-service/src/observability.ts); métricas en `metrics.ts`, logs en `logger.ts`; propagación por NATS en [`natsRpcClient.ts`](src/api-gateway/src/nats/natsRpcClient.ts) (inyecta) y `httpBridge.ts` de cada microservicio (extrae) |
| Catálogo de métricas | [`docs/catalogo-metricas.md`](docs/catalogo-metricas.md) |
| Stack de observabilidad (GitOps) | `bootstrap/apps/observability-prometheus-app.yaml` y `observability-resources-app.yaml`; manifiestos en `apps/observability/` del repo GitOps |
| AnalysisTemplate (consulta Prometheus) | `api-gateway-canary-metrics`, archivo `apps/sa-platform/charts/api-gateway/templates/analysistemplate.yaml` del repo GitOps (proveedor `prometheus`, sin Job de pruebas) |
| Consultas PromQL del canary | Error: `sum(rate(app_http_requests_total{service="api-gateway",route=~"/api/.*",status_class="5xx",rollouts_pod_template_hash="<hash canary>"}[1m])) / sum(rate(app_http_requests_total{...mismo filtro sin status_class...}[1m]))` (umbral 5 %). Latencia: `histogram_quantile(0.95, …app_http_request_duration_seconds_bucket…)` (umbral 1 s). Texto completo en el archivo anterior |
| SLO declarados | SLO-1 disponibilidad 99 % y SLO-2 latencia 99 % < 2 s, ventana de 30 días — [`docs/slo.md`](docs/slo.md) |
| Reglas de grabación y alertas | `PrometheusRule` `sa-p8-slo`, archivo `apps/observability/slo-rules.yaml` del repo GitOps |
| Runbooks | [`docs/runbooks/`](docs/runbooks/) (uno por alerta, enlazado en `runbook_url`) |
| Tablero Grafana | JSON exportado: [`dashboards/dashboard-operacion.json`](dashboards/dashboard-operacion.json) (se carga solo desde `apps/observability/dashboards/dashboard-operacion.yaml` del repo GitOps); capturas: [`docs/evidencias/`](docs/evidencias/) |
| Consultas de referencia (PromQL / LogQL / TraceQL) | [`docs/consultas.md`](docs/consultas.md) |
| Evidencia de reversión automática del canary | [`docs/evidencias/canary-reversion.txt`](docs/evidencias/canary-reversion.txt) |
| Evidencia del recorrido síntoma → causa | [`docs/evidencias/sintoma-causa.txt`](docs/evidencias/sintoma-causa.txt) |
| Informe de operación (≤ 2 páginas, 6 campos) | [`docs/informe-operacion.md`](docs/informe-operacion.md) |
| Diagrama del flujo de telemetría | [`docs/diagrama-telemetria.md`](docs/diagrama-telemetria.md) |
| Video de demostración (5–8 min) | [PENDIENTE: pegar aquí la URL pública del video y su minutaje] |

**Nota sobre el acceso en vivo:** Prometheus (`kps-prometheus`, puerto 9090)
y Grafana (`kps-grafana`, puerto 80 → usuario `admin`, clave
`p10-observabilidad`) viven dentro del clúster; se abren en el navegador con
`P10/scripts/06-grafana.ps1`. El clúster permanece encendido hasta el día de
la calificación.

## Fallos inducidos (distintos al de la P8)

Se controlan sólo por GitOps (`apps/sa-platform/values-p10-faults.yaml`, todo
en `"0"` por defecto):

| Fallo | Servicio | Efecto | Lo que demuestra |
|---|---|---|---|
| `FAULT_ERROR_RATE` | `api-gateway` | responde 500 a la fracción indicada de las peticiones `/api/*` | el canary se revierte solo por métricas |
| `FAULT_DB_DELAY_MS` + `FAULT_ERROR_RATE` | `reserva-service` | cada operación espera dentro de PostgreSQL (`pg_sleep`) y falla con probabilidad p (503) | alerta → traza → log hasta la causa |

## Cómo se ejecuta (en orden)

1. `P10\scripts\00-nodepool.ps1` — pool de nodos `obs-pool` para el stack.
2. Publicar las imágenes: commit/push de este repo y `git tag p10-v1.0.0` + `git push origin p10-v1.0.0`; esperar el pipeline en verde.
3. Commit/push del repo GitOps: ArgoCD despliega el stack y las imágenes nuevas.
4. `P10\scripts\01-verificar.ps1` — comprobación de punta a punta.
5. `P10\scripts\02-canary-falla.ps1` — reversión automática del canary.
6. `P10\scripts\03-sintoma-causa.ps1` — recorrido síntoma → causa cronometrado.
7. `P10\scripts\05-informe.ps1` — genera `docs/informe-operacion.md` con los tiempos medidos.
8. `P10\scripts\04-restaurar.ps1` — seguro: apaga cualquier fallo inducido.

## Cambios sobre P8/P9

Sólo en el repo GitOps, `apps/sa-platform` (todo lo de P9 — Terraform, Velero,
Sealed Secrets, DR — queda intacto):

- `rollout.yaml` del api-gateway: los 3 pasos de análisis usan el nuevo
  `AnalysisTemplate` por métricas (antes, un Job de k6) y el contenedor
  expone el puerto `metrics` (9464).
- `deployment.yaml` de auth-service y reserva-service: puerto `metrics`.
- `bootstrap/apps/sa-platform-app.yaml`: se suman `values-p10.yaml` (imágenes
  `p10-v1.0.0` y más memoria por el SDK) y `values-p10-faults.yaml`.
- `analysistemplate.yaml` del api-gateway sustituye al de k6 de la P8.

Correcciones de P9 descubiertas al verificar esta práctica (no cambian su
diseño):

- Repo GitOps, `apps/sa-platform/values-p9-resilience.yaml`: el *hook* de
  Velero del pod de PostgreSQL ejecutaba `pg_dumpall -U postgres` con la
  contraseña de `sa_admin`, así que fallaba y los respaldos diarios de datos
  quedaban `PartiallyFailed` (aunque el snapshot del disco sí se tomaba).
  Ahora usa `-U sa_admin --no-role-passwords`; un respaldo de prueba quedó
  `Completed` con 0 errores.
- Repo de código: se añadió `P9/bootstrap.sh` como punto de entrada único del
  bootstrap (envuelve `terraform apply` y reconecta `kubectl`); la tabla 4.1
  del README de P9 apunta a él.

Para el generador de carga (`apps/observability/loadgen.yaml`): usa un usuario
que solo lista y otro que solo crea reservas a ritmo bajo; una versión
anterior hacía crecer sin límite el listado de un solo usuario (16 mil filas)
y tumbaba `reserva-service`.
