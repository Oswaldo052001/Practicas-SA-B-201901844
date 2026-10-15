// Practica 10 - Instrumentacion con OpenTelemetry (SDK).
//
// IMPORTANTE: este modulo debe ser el PRIMER import de index.ts. Las
// instrumentaciones de http/express/pg "parchean" esos modulos al
// cargarse, asi que tienen que registrarse antes de que el resto del
// codigo los importe (TypeScript compila a CommonJS respetando el orden
// de los imports).
//
// Las tres senales salen asi:
//   - Trazas:   SDK -> OTLP/HTTP -> OpenTelemetry Collector -> Tempo
//   - Metricas: SDK -> exportador Prometheus en el puerto 9464 (/metrics),
//               que Prometheus raspa via PodMonitor
//   - Registros: JSON a stdout con trace_id (ver logger.ts); el Collector
//               (DaemonSet) los lee de los archivos del nodo y los manda a Loki
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation, ExpressLayerType } from "@opentelemetry/instrumentation-express";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

export const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "api-gateway";
const OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel-collector.observability.svc.cluster.local:4318";
const METRICS_PORT = Number(process.env.METRICS_PORT || 9464);

// Puerto de metricas separado del puerto de la aplicacion: asi /metrics no
// pasa por el api-gateway ni por NATS, y los probes no lo cuentan como trafico.
const prometheusExporter = new PrometheusExporter({ port: METRICS_PORT, host: "0.0.0.0" });

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || "p10",
    "deployment.environment": process.env.ENVIRONMENT || "p8",
    "k8s.pod.name": process.env.HOSTNAME || "local",
  }),
  traceExporter: new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces` }),
  metricReaders: [prometheusExporter],
  instrumentations: [
    new HttpInstrumentation({
      // Los probes de Kubernetes y el scrape de Prometheus no son trafico de
      // usuarios: no generan trazas (evitaria ruido y costo de almacenamiento).
      ignoreIncomingRequestHook: (req) => req.url === "/health" || req.url === "/ready-check" || req.url === "/metrics",
    }),
    // Solo el span del handler de la ruta: los de cada middleware interno
      // (query, expressInit, textParser...) agregan ruido sin informacion.
      new ExpressInstrumentation({ ignoreLayersType: [ExpressLayerType.MIDDLEWARE, ExpressLayerType.ROUTER] }),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .catch(() => undefined)
    .finally(() => process.exit(0));
});
