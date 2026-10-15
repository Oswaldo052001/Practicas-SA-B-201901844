# SLO de la Práctica 10

Los SLO se miden en el **api-gateway**, la única puerta de entrada de los
usuarios, sobre las rutas `/api/*` (se excluyen los probes de Kubernetes
`/health` y `/ready-check`, que no son tráfico de usuarios).

| # | SLO | Objetivo | Ventana | Presupuesto de error |
|---|---|---|---|---|
| SLO-1 | **Disponibilidad**: peticiones `/api/*` que terminan sin error 5xx | 99 % | 30 días móviles | 1 % de las peticiones |
| SLO-2 | **Latencia**: peticiones `/api/*` que responden en menos de 2 s | 99 % | 30 días móviles | 1 % de las peticiones |

## Justificación

- **Por qué estos dos indicadores.** Un usuario de CineTix percibe el
  sistema de dos formas: o la acción funciona (disponibilidad) o funciona
  pero tarda tanto que da igual (latencia). Son las dos señales que se
  traducen directamente en reservas perdidas. Ambos se calculan a partir
  de las mismas métricas RED (`app_http_requests_total` y
  `app_http_request_duration_seconds`), así que no hay que mantener
  instrumentación adicional.
- **Por qué sólo 5xx cuentan como error.** Un 4xx (clave incorrecta, reserva
  con 0 asientos) es una respuesta correcta del sistema a un pedido
  incorrecto del usuario; contarlo castigaría al servicio por el
  comportamiento del cliente. Un 5xx, un 503 de la base de datos o un 504
  por falta de respuesta de un microservicio sí es falla del sistema.
- **Por qué 99 % y no 99,9 %.** Es una plataforma de un solo cluster, un
  único pod de Postgres y un solo nodo de observabilidad: prometer 99,9 %
  (43 min de caída al mes) sería un número que la arquitectura actual no
  puede sostener. 99 % (7,2 h al mes) es honesto y, aun así, exigente
  frente a los despliegues canary frecuentes.
- **Por qué 2 s.** Es el umbral a partir del cual la interfaz de selección
  de asientos deja de sentirse interactiva. El histograma tiene un bucket
  exacto en `le="2.0"`, por lo que el SLI se calcula sin interpolar.
- **Por qué 30 días.** Es el periodo con que se habla de presupuestos de
  error en la industria y coincide con la retención de Prometheus (30 d).

## Indicadores y reglas (recording rules)

Archivo: `apps/observability/slo-rules.yaml` del repo GitOps
(`PrometheusRule` `sa-p8-slo`). Resumen:

| Regla | Qué mide |
|---|---|
| `sa:http_requests:rate{1m,5m,1h}` | peticiones/s `/api/*` en el gateway |
| `sa:http_errors:rate{1m,5m,1h}` | peticiones/s con 5xx |
| `sa:http_error_ratio:rate{1m,5m,1h}` | **SLI de error** = errores / peticiones (la disponibilidad es `1 - esto`) |
| `sa:http_latency_p95:rate5m` | percentil 95 de latencia |
| `sa:http_slow_ratio:rate5m` | **SLI de latencia**: fracción de peticiones más lentas que 2 s |

**Presupuesto consumido** (panel "Presupuesto de error restante" del tablero):

```
1 - ((1 - disponibilidad_30d) / 0.01)
```

donde `disponibilidad_30d = 1 - increase(5xx[30d]) / increase(total[30d])`.
100 % significa presupuesto intacto; 0 % o menos, SLO incumplido.

## Alertas por consumo de presupuesto (burn rate)

*Burn rate* = tasa de error observada / presupuesto (0,01). Un burn de 10
agota el presupuesto de 30 días en 3 días.

| Alerta | Condición | `for` | Severidad | Runbook |
|---|---|---|---|---|
| `SLODisponibilidadQuemaRapida` | error ≥ 10 % (burn ≥ 10) en 5 min **y** en 1 min | 1 m | page | [runbook](runbooks/SLODisponibilidadQuemaRapida.md) |
| `SLODisponibilidadQuemaLenta` | error ≥ 3 % (burn ≥ 3) en 1 h **y** en 5 min | 5 m | ticket | [runbook](runbooks/SLODisponibilidadQuemaLenta.md) |
| `SLOLatenciaAlta` | > 5 % de las peticiones tardan más de 2 s (5 min) | 2 m | page | [runbook](runbooks/SLOLatenciaAlta.md) |
| `ServicioSinMetricas` | un servicio instrumentado no responde al scrape | 2 m | page | [runbook](runbooks/ServicioSinMetricas.md) |
| `GatewayNATSSinRespuesta` | el gateway no recibe respuesta NATS de un microservicio | 2 m | page | [runbook](runbooks/GatewayNATSSinRespuesta.md) |

Las dos ventanas en cada alerta de quema (larga **y** corta) evitan dos
males: alertar por un pico ya terminado (la ventana corta lo apaga) y
tardar horas en notar un problema (la larga lo confirma sin esperar).
