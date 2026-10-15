# Consultas de referencia (PromQL, LogQL, TraceQL)

Para la defensa en Grafana → *Explore*. Fuentes de datos: `Prometheus`,
`Loki`, `Tempo`.

## PromQL

```promql
# Tráfico por ruta (req/s)
sum by (route) (rate(app_http_requests_total{service="api-gateway",route=~"/api/.*"}[1m]))

# Tasa de error 5xx (SLI de disponibilidad = 1 - esto)
sa:http_error_ratio:rate5m

# p95 de latencia del gateway
histogram_quantile(0.95, sum by (le) (rate(app_http_request_duration_seconds_bucket{service="api-gateway",route=~"/api/.*"}[5m])))

# Fracción de peticiones más lentas que 2 s (SLI de latencia)
1 - sum(rate(app_http_request_duration_seconds_bucket{service="api-gateway",route=~"/api/.*",le="2"}[5m])) / sum(rate(app_http_request_duration_seconds_count{service="api-gateway",route=~"/api/.*"}[5m]))

# Quema del presupuesto (burn rate)
sa:http_error_ratio:rate5m / 0.01

# Error por versión (stable vs canary) - lo que mide el AnalysisTemplate
sum by (rollouts_pod_template_hash) (rate(app_http_requests_total{service="api-gateway",route=~"/api/.*",status_class="5xx"}[1m]))
  / sum by (rollouts_pod_template_hash) (rate(app_http_requests_total{service="api-gateway",route=~"/api/.*"}[1m]))

# Negocio: reservas por resultado y logins por resultado
sum by (resultado) (rate(app_reservas_total[5m]))
sum by (resultado) (rate(app_logins_total[5m]))

# Saturación
app_process_resident_memory_bytes{service="reserva-service"}
app_eventloop_delay_p99_seconds
```

## LogQL

```logql
# Todos los registros de error de los servicios
{k8s_namespace_name="sa-p8", service_name=~"api-gateway|auth-service|reserva-service"} | level="error"

# Todo lo que pasó en UNA petición (el trace_id se copia de la cabecera x-trace-id o de Tempo)
{k8s_namespace_name="sa-p8"} | trace_id="<TRACE_ID>"

# Peticiones lentas del gateway (> 1 s)
{service_name="api-gateway"} | msg="http_request" | duration_ms > 1000

# Errores por minuto, por servicio
sum by (service_name) (count_over_time({k8s_namespace_name="sa-p8"} | level="error" [1m]))
```

## TraceQL

```traceql
# Trazas con error del gateway
{ resource.service.name = "api-gateway" && status = error }

# Trazas con alguna operación de Postgres lenta (> 1 s) en reserva-service
{ resource.service.name = "reserva-service" && span.db.system = "postgresql" && duration > 1s }

# Peticiones que cruzaron NATS y tardaron más de 2 s
{ name =~ "NATS request.*" && duration > 2s }
```

## Cómo se obtiene un `trace_id` sin Grafana

Toda respuesta del gateway trae la cabecera `x-trace-id`:

```powershell
curl.exe -s -i http://<IP-DEL-GATEWAY>:3000/api/reservas/usuario/1 | Select-String x-trace-id
```
