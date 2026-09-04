import express from "express";
import { pedirPorNats } from "./nats/natsRpcClient";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// Captura el cuerpo crudo (sin parsear) para poder reenviarlo tal cual
// llego, sin importar si es JSON (REST), una consulta GraphQL, o vacio.
app.use(express.text({ type: "*/*", limit: "5mb" }));

interface Ruta {
  prefijo: string;
  servicio: string;
  reescribirPath: (path: string) => string;
}

// Practica 4/5: cada regla usaba http-proxy-middleware con pathFilter +
// pathRewrite apuntando a la URL interna del servicio. Practica 6: la misma
// tabla de rutas, pero en vez de un target HTTP, cada regla apunta al
// "servicio" NATS que debe resolverla (subject svc.<servicio>.http).
const rutas: Ruta[] = [
  { prefijo: "/api/auth", servicio: "auth-service", reescribirPath: (p) => p.replace(/^\/api\/auth/, "") || "/" },
  {
    prefijo: "/api/graphql-reservas",
    servicio: "reserva-service",
    reescribirPath: (p) => p.replace(/^\/api\/graphql-reservas/, "/graphql"),
  },
  {
    prefijo: "/api/reservas",
    servicio: "reserva-service",
    reescribirPath: (p) => p.replace(/^\/api\/reservas/, "/reservas"),
  },
  { prefijo: "/api/pagos", servicio: "pago-service", reescribirPath: (p) => p.replace(/^\/api\/pagos/, "") || "/" },
  {
    prefijo: "/api/notificaciones",
    servicio: "notificacion-service",
    reescribirPath: (p) => p.replace(/^\/api\/notificaciones/, "") || "/",
  },
];

const HEADERS_A_OMITIR = new Set(["content-length", "transfer-encoding", "connection"]);

app.use(async (req, res) => {
  const ruta = rutas.find((r) => req.path.startsWith(r.prefijo));
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
