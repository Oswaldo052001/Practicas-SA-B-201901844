// Practica 10: este import DEBE ir primero (registra OpenTelemetry antes de
// que express/http se carguen). Ver observability.ts.
import "./observability";
import express from "express";
import { context, trace } from "@opentelemetry/api";
import { pedirPorNats } from "./nats/natsRpcClient";
import { encontrarRuta } from "./routing";
import { httpDuration, httpRequests, claseDeEstado } from "./metrics";
import { log } from "./logger";
import { aplicarFalloInyectado } from "./fault";

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Practica 10: middleware de observabilidad (va antes que cualquier ruta).
//  1. Devuelve el trace_id al cliente en el header "x-trace-id": el usuario
//     (o soporte) puede copiarlo y pegarlo en Grafana/Tempo.
//  2. Al terminar la respuesta registra las metricas RED (tasa, errores y
//     duracion) y UNA linea de registro JSON con el trace_id.
app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();
  const sc = trace.getSpan(context.active())?.spanContext();
  if (sc) res.setHeader("x-trace-id", sc.traceId);

  res.on("finish", () => {
    const segundos = Number(process.hrtime.bigint() - inicio) / 1e9;
    const ruta = encontrarRuta(req.path);
    const route = ruta ? ruta.prefijo : req.path === "/health" || req.path === "/ready-check" ? req.path : "otro";
    const atributos = {
      route,
      method: req.method,
      status: String(res.statusCode),
      status_class: claseDeEstado(res.statusCode),
    };
    httpRequests.add(1, atributos);
    httpDuration.record(segundos, atributos);
    // Solo el trafico de usuarios (/api/*) se registra: los probes de
    // Kubernetes (/health) llegarian cada pocos segundos y solo harian ruido.
    if (route.startsWith("/api")) {
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
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// /ready-check: chequeo funcional MAS PROFUNDO que /health (que solo
// prueba que el proceso Express esta vivo, usado por los probes de
// Kubernetes). En la Practica 8 era el endpoint que validaba el
// AnalysisTemplate del canary con k6 (y el que se rompio a proposito para
// el fallo inducido de P8). En la Practica 10 el canary ya NO lo usa: se
// decide con metricas reales de trafico de usuarios (ver AnalysisTemplate
// api-gateway-canary-metrics en el repo GitOps). Se conserva por
// compatibilidad con P8.
app.get("/ready-check", (_req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway", check: "ready-check" });
});

// Captura el cuerpo crudo (sin parsear) para poder reenviarlo tal cual
// llego, sin importar si es JSON (REST), una consulta GraphQL, o vacio.
app.use(express.text({ type: "*/*", limit: "5mb" }));

// Practica 7: la tabla de rutas y su logica de reescritura viven en
// ./routing.ts para poder probarlas con pruebas unitarias sin levantar
// Express (ver src/__tests__/routing.test.ts).
const HEADERS_A_OMITIR = new Set(["content-length", "transfer-encoding", "connection"]);

app.use(async (req, res) => {
  const ruta = encontrarRuta(req.path);
  if (!ruta) {
    return res.status(404).json({ error: "ruta no reconocida por el api-gateway" });
  }

  // Practica 10: fallo inducido (apagado por defecto, ver fault.ts).
  const falla = await aplicarFalloInyectado(ruta.prefijo);
  if (falla.provocarError) {
    return res.status(500).json({ error: "fallo inyectado en api-gateway (version degradada, Practica 10)" });
  }

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers[k] = v;
  }

  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const respuesta = await pedirPorNats(ruta.servicio, {
    method: req.method,
    path: ruta.reescribirPath(req.path) + query,
    headers,
    body: typeof req.body === "string" && req.body.length > 0 ? req.body : null,
  });

  res.status(respuesta.status);
  for (const [k, v] of Object.entries(respuesta.headers)) {
    if (!HEADERS_A_OMITIR.has(k.toLowerCase())) {
      res.setHeader(k, v);
    }
  }
  res.send(respuesta.body);
});

app.listen(PORT, () => {
  log("info", `api-gateway escuchando en puerto ${PORT} (enrutando via NATS request-reply, sin HTTP directo a los microservicios)`);
});
