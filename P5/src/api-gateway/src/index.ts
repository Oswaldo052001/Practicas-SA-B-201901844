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
// NOTA (tag p8-v1.0.7): en el tag p8-v1.0.6 este endpoint se rompio
// DELIBERADAMENTE (devolvia 500 siempre) para demostrar que el
// AnalysisTemplate del canary lo detecta y que Argo Rollouts revierte el
// despliegue solo, sin llegar al 100% de los usuarios - evidencia
// capturada en P8/docs/informe-incidente.md. Este tag revierte el fallo
// inducido y deja el endpoint sano para la calificacion.
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
