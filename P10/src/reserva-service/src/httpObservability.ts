// Practica 10 - Middleware de observabilidad de Express (RED por ruta + un
// registro JSON por peticion con trace_id).
import { NextFunction, Request, Response } from "express";
import { context, trace } from "@opentelemetry/api";
import { claseDeEstado, httpDuration, httpRequests } from "./metrics";
import { log } from "./logger";

export function observabilidadHttp(req: Request, res: Response, next: NextFunction): void {
  const inicio = process.hrtime.bigint();
  const sc = trace.getSpan(context.active())?.spanContext();

  res.on("finish", () => {
    const segundos = Number(process.hrtime.bigint() - inicio) / 1e9;
    // req.route.path es la plantilla de la ruta (p. ej. /reservas/usuario/:usuarioId),
    // no la URL real: mantiene baja la cardinalidad de la etiqueta "route".
    const route = (req.route && req.route.path) || req.baseUrl || "sin_ruta";
    const atributos = {
      route,
      method: req.method,
      status: String(res.statusCode),
      status_class: claseDeEstado(res.statusCode),
    };
    httpRequests.add(1, atributos);
    httpDuration.record(segundos, atributos);
    if (route !== "/health") {
      log(res.statusCode >= 500 ? "error" : "info", "http_request", {
        method: req.method,
        route,
        status: res.statusCode,
        duration_ms: Math.round(segundos * 1000),
        trace_id: sc?.traceId ?? "",
        span_id: sc?.spanId ?? "",
      });
    }
  });
  next();
}
