# Catálogo de métricas

Todas las métricas las emite el SDK de OpenTelemetry de cada servicio por
`/metrics` (puerto 9464) y las recoge Prometheus con un `PodMonitor`
(`apps/observability/podmonitors.yaml`). Prometheus añade las etiquetas
`service` (nombre del contenedor), `pod` y `rollouts_pod_template_hash`
(versión del ReplicaSet).

| Métrica | Tipo | Etiquetas | Servicio | Definición |
|---|---|---|---|---|
| `app_http_requests_total` | contador | `route`, `method`, `status`, `status_class` | los 3 | Peticiones HTTP atendidas. Base de tráfico y errores (señales 1 y 2). |
| `app_http_request_duration_seconds` | histograma | `route`, `method`, `status`, `status_class` | los 3 | Duración de la petición en segundos (cortes 25 ms … 10 s, con `le="1"` y `le="2"`). Señal 3. |
| `app_nats_request_duration_seconds` | histograma | `servicio`, `resultado` (`ok`, `error_5xx`, `timeout_o_error`) | api-gateway | Duración de la llamada NATS request-reply a un microservicio. |
| `app_logins_total` | contador | `resultado` (`exitoso`, `rechazado`) | auth-service | **Negocio:** inicios de sesión. |
| `app_registros_total` | contador | `resultado` (`exitoso`, `rechazado`) | auth-service | **Negocio:** altas de usuario. |
| `app_reservas_total` | contador | `resultado` (`creada`, `rechazada`, `error`) | reserva-service | **Negocio:** reservas. `rechazada` = error del usuario (400); `error` = falla del sistema (5xx). |
| `app_eventloop_delay_p99_seconds` | medidor | — | los 3 | Saturación: retraso p99 del *event loop* de Node.js. |
| `app_process_resident_memory_bytes` | medidor | — | los 3 | Saturación: memoria residente del proceso (límite del pod: 256 MiB). |
| `app_process_cpu_cores` | medidor | — | los 3 | Saturación: núcleos de CPU consumidos por el proceso. |
| `app_pg_pool_connections` | medidor | `estado` (`total`, `idle`, `waiting`) | auth y reserva | Saturación: conexiones del pool de PostgreSQL. |

Cuatro señales de oro: tráfico (`app_http_requests_total`), errores
(`status_class="5xx"`), latencia (`app_http_request_duration_seconds`) y
saturación (memoria, CPU, event loop, pool).
