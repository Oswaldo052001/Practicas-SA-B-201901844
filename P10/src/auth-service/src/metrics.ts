// Practica 10 - Metricas tecnicas, de negocio y de saturacion (OpenTelemetry Metrics).
//
// Los nombres que ve Prometheus (el exportador solo agrega _total a los
// contadores; el sufijo de la unidad va escrito en el nombre del instrumento
// y la version del exportador esta fijada en package.json) son:
//   app_http_requests_total{route,method,status,status_class}
//   app_http_request_duration_seconds_bucket{route,method,le}
//   app_eventloop_delay_p99_seconds, app_process_resident_memory_bytes, ...
import { metrics } from "@opentelemetry/api";
import { monitorEventLoopDelay } from "perf_hooks";
import { SERVICE_NAME } from "./observability";

const meter = metrics.getMeter(SERVICE_NAME);

// Limites de los buckets (segundos). Incluyen 1 y 2 porque los SLO y el
// analisis del canary se calculan sobre esos cortes (ver las reglas en el
// repo GitOps: apps/observability/rules).
const BUCKETS_SEGUNDOS = [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10];

export const httpRequests = meter.createCounter("app_http_requests", {
  description: "Peticiones HTTP atendidas por el servicio",
});
export const httpDuration = meter.createHistogram("app_http_request_duration_seconds", {
  description: "Duracion de las peticiones HTTP",
  unit: "s",
  advice: { explicitBucketBoundaries: BUCKETS_SEGUNDOS },
});

// ---- Metricas de NEGOCIO (las entiende alguien que no es ingeniero) ----
// "Inicios de sesion rechazados por minuto" y "usuarios registrados" dicen
// mas sobre la salud del producto que la CPU de un pod.
export const logins = meter.createCounter("app_logins", {
  description: "Inicios de sesion, por resultado (exitoso | rechazado)",
});
export const registros = meter.createCounter("app_registros", {
  description: "Registros de usuario, por resultado (exitoso | rechazado)",
});

export function claseDeEstado(status: number): string {
  return `${Math.floor(status / 100)}xx`;
}

// ---- Saturacion (cuarta senal de oro) ----
const retrasoEventLoop = monitorEventLoopDelay({ resolution: 20 });
retrasoEventLoop.enable();

meter
  .createObservableGauge("app_eventloop_delay_p99_seconds", {
    description: "Retraso p99 del event loop de Node.js: si sube, el proceso esta saturado de CPU",
    unit: "s",
  })
  .addCallback((r) => {
    r.observe(retrasoEventLoop.percentile(99) / 1e9);
    retrasoEventLoop.reset();
  });

meter
  .createObservableGauge("app_process_resident_memory_bytes", {
    description: "Memoria residente (RSS) del proceso",
    unit: "By",
  })
  .addCallback((r) => r.observe(process.memoryUsage().rss));

let ultimoCpu = process.cpuUsage();
let ultimoReloj = process.hrtime.bigint();
meter
  .createObservableGauge("app_process_cpu_cores", {
    description: "CPU consumida por el proceso, en nucleos (1.0 = un nucleo completo)",
    unit: "{core}",
  })
  .addCallback((r) => {
    const ahora = process.hrtime.bigint();
    const cpu = process.cpuUsage(ultimoCpu);
    const segundos = Number(ahora - ultimoReloj) / 1e9;
    if (segundos > 0) r.observe((cpu.user + cpu.system) / 1e6 / segundos);
    ultimoCpu = process.cpuUsage();
    ultimoReloj = ahora;
  });

// ---- Saturacion del pool de conexiones a Postgres ----
// waiting > 0 de forma sostenida significa que las consultas hacen cola
// esperando una conexion: es saturacion aunque el CPU este tranquilo.
export function registrarMetricasDelPool(pool: { totalCount: number; idleCount: number; waitingCount: number }): void {
  meter
    .createObservableGauge("app_pg_pool_connections", {
      description: "Conexiones del pool de Postgres, por estado (total | idle | waiting)",
    })
    .addCallback((r) => {
      r.observe(pool.totalCount, { estado: "total" });
      r.observe(pool.idleCount, { estado: "idle" });
      r.observe(pool.waitingCount, { estado: "waiting" });
    });
}
