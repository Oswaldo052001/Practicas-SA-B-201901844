import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = Number(process.env.PORT || 3000);

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";
const RESERVA_SERVICE_URL = process.env.RESERVA_SERVICE_URL || "http://reserva-service:3003";
const PAGO_SERVICE_URL = process.env.PAGO_SERVICE_URL || "http://pago-service:3004";
const NOTIFICACION_SERVICE_URL = process.env.NOTIFICACION_SERVICE_URL || "http://notificacion-service:3005";

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// Leccion de la Practica 4: usar router.use("/prefijo", proxy) hace que
// Express recorte el prefijo antes de que http-proxy-middleware pueda
// reescribirlo. La forma correcta es usar pathFilter directamente en el
// proxy, sin montarlo bajo un prefijo con router.use.
app.use(
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathFilter: (pathname) => pathname.startsWith("/api/auth"),
    pathRewrite: { "^/api/auth": "" },
  })
);

app.use(
  createProxyMiddleware({
    target: RESERVA_SERVICE_URL,
    changeOrigin: true,
    pathFilter: (pathname) => pathname.startsWith("/api/reservas") || pathname.startsWith("/api/graphql-reservas"),
    pathRewrite: { "^/api/reservas": "/reservas", "^/api/graphql-reservas": "/graphql" },
  })
);

app.use(
  createProxyMiddleware({
    target: PAGO_SERVICE_URL,
    changeOrigin: true,
    pathFilter: (pathname) => pathname.startsWith("/api/pagos"),
    pathRewrite: { "^/api/pagos": "" },
  })
);

app.use(
  createProxyMiddleware({
    target: NOTIFICACION_SERVICE_URL,
    changeOrigin: true,
    pathFilter: (pathname) => pathname.startsWith("/api/notificaciones"),
    pathRewrite: { "^/api/notificaciones": "" },
  })
);

app.listen(PORT, () => {
  console.log(`api-gateway escuchando en puerto ${PORT}`);
});
