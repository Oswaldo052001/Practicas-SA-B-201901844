// Practica 10 - Registros estructurados (JSON) con el identificador de traza.
//
// Cada linea es un objeto JSON en stdout con trace_id y span_id del span
// activo (si hay uno), de modo que:
//   - desde una traza se llega a sus registros: {...} | json | trace_id="<id>"
//   - desde un registro se llega a su traza: Grafana convierte trace_id en
//     un enlace a Tempo (campo derivado en el datasource de Loki).
// Fuera de una peticion (arranque, cierre) trace_id va vacio, pero la clave
// siempre esta presente para que las consultas por campo no cambien de forma.
import { context, trace } from "@opentelemetry/api";
import { SERVICE_NAME } from "./observability";

export type Nivel = "debug" | "info" | "warn" | "error";

export function log(nivel: Nivel, mensaje: string, campos: Record<string, unknown> = {}): void {
  const sc = trace.getSpan(context.active())?.spanContext();
  const registro = {
    ts: new Date().toISOString(),
    level: nivel,
    service: SERVICE_NAME,
    msg: mensaje,
    trace_id: sc?.traceId ?? "",
    span_id: sc?.spanId ?? "",
    ...campos,
  };
  process.stdout.write(JSON.stringify(registro) + "\n");
}
