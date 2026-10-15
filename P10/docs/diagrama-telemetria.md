# Flujo de telemetría

```mermaid
flowchart LR
  U([Usuario / k6 loadgen]) -->|HTTP /api/*<br/>respuesta con x-trace-id| GW

  subgraph sap8 [namespace sa-p8 — aplicación instrumentada con OpenTelemetry SDK]
    GW[api-gateway]
    AU[auth-service]
    RE[reserva-service]
    NATS[(NATS)]
    PG[(PostgreSQL)]
    GW -- "request-reply<br/>traceparent en los headers del mensaje" --> NATS
    NATS --> AU
    NATS --> RE
    AU --> PG
    RE --> PG
  end

  subgraph obs [namespace observability — desplegado por ArgoCD]
    COL[OTel Collector<br/>gateway OTLP]
    COLL[OTel Collector<br/>DaemonSet filelog]
    TEMPO[(Tempo<br/>trazas)]
    LOKI[(Loki<br/>registros)]
    PROM[(Prometheus<br/>métricas + reglas SLO)]
    AM[Alertmanager]
    SINK[alert-sink<br/>webhook]
    GRAF[Grafana<br/>tablero SLO + Explore]
  end

  GW & AU & RE -. "TRAZAS: OTLP/HTTP :4318" .-> COL --> TEMPO
  GW & AU & RE -. "MÉTRICAS: /metrics :9464<br/>(scrape cada 15 s, PodMonitor)" .-> PROM
  GW & AU & RE -. "REGISTROS JSON a stdout<br/>con trace_id" .-> COLL --> LOKI
  PROM -- "alertas (burn rate)" --> AM --> SINK
  PROM --> GRAF
  TEMPO <--> GRAF
  LOKI <--> GRAF

  subgraph rollouts [Argo Rollouts]
    AR[AnalysisRun<br/>PromQL por hash del canary]
  end
  AR -- "consulta error y p95" --> PROM
  AR -- "falla ⇒ aborta y revierte a stable" --> GW
```

## Cómo se correlacionan las tres señales

- **Traza ↔ registro:** cada línea de log JSON lleva `trace_id` y `span_id`
  del span activo. En Grafana, el datasource de Loki convierte `trace_id` en
  un enlace a Tempo (*campo derivado*) y el de Tempo abre en Loki los
  registros con ese `trace_id` (*traces to logs*).
- **Contexto a través de NATS:** NATS no es HTTP, así que OpenTelemetry no
  propaga el contexto solo. El gateway ya viaja los headers HTTP dentro del
  mensaje; ahí inyecta el header W3C `traceparent` y el *bridge* de cada
  microservicio lo extrae y continúa la **misma traza**. El gateway devuelve
  el `trace_id` al cliente en la cabecera `x-trace-id`.
- **Métrica ↔ versión:** Prometheus etiqueta cada serie con
  `rollouts_pod_template_hash` (el ReplicaSet de Argo Rollouts), lo que
  permite medir sólo los pods del canary.
