import express from "express";
import { pedirPorNats } from "./nats/natsRpcClient";
import { encontrarRuta } from "./routing";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// /ready-check: chequeo funcional MAS PROFUNDO que /health (que solo
// prueba que el proceso Express esta vivo, usado por los probes de
// Kubernetes). Este endpoint es el que valida el AnalysisTemplate del
// canary con k6 (criterio 2.4/2.5) - simula una verificacion real de que
// el servicio esta listo para recibir trafico de produccion, no solo que
// el proceso arranco.
//
// FALLO INDUCIDO DELIBERADAMENTE (tag p8-v1.0.6) para demostrar que el
// AnalysisTemplate lo detecta durante el canary y Argo Rollouts revierte
// el despliegue solo, sin que llegue al 100% de los usuarios. Se separa de
// /health a proposito: si rompieramos /health, el readiness probe de k8s
// nunca marcaria el pod como Ready y el rollout se quedaria atascado antes
// de llegar siquiera al paso de analisis. Ver P8/README.md e informe de
// incidente.
app.get("/ready-check", (_req, res) => {
  res.status(500).json({ status: "error", service: "api-gateway", reason: "induced-failure-p8" });
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
  console.log(`api-gateway escuchando en puerto ${PORT} (enrutando via NATS request-reply, sin HTTP directo a los microservicios)`);
});
