import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verificarAuth } from "../middlewares/verificarAuth";

const router = Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL as string;
const PELICULA_SERVICE_URL = process.env.PELICULA_SERVICE_URL as string;
const RESERVA_SERVICE_URL = process.env.RESERVA_SERVICE_URL as string;
const PAGO_SERVICE_URL = process.env.PAGO_SERVICE_URL as string;
const NOTIFICACION_SERVICE_URL = process.env.NOTIFICACION_SERVICE_URL as string;

// Nota: los proxies se montan sin prefijo de ruta (usando pathFilter en vez de
// router.use("/prefijo", proxy)). Si se monta con prefijo, Express recorta ese
// prefijo del req.url antes de que el proxy lo vea, y pathRewrite deja de
// coincidir correctamente. Los middlewares de autenticacion si pueden montarse
// con prefijo porque no dependen del contenido de la url.

router.use("/api/reservas", verificarAuth);
router.use("/graphql/reservas", verificarAuth);
router.use("/api/pagos", verificarAuth);
router.use("/graphql/pagos", verificarAuth);
router.use("/api/notificaciones", verificarAuth);

router.use(
  createProxyMiddleware({
    pathFilter: "/api/auth",
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "" }
  })
);

router.use(
  createProxyMiddleware({
    pathFilter: ["/api/peliculas", "/api/funciones", "/api/salas"],
    target: PELICULA_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api": "" }
  })
);

router.use(
  createProxyMiddleware({
    pathFilter: "/api/reservas",
    target: RESERVA_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/reservas": "/reservas" }
  })
);

router.use(
  createProxyMiddleware({
    pathFilter: "/graphql/reservas",
    target: RESERVA_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/graphql/reservas": "/graphql" }
  })
);

router.use(
  createProxyMiddleware({
    pathFilter: "/api/pagos",
    target: PAGO_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/pagos": "/pagos" }
  })
);

router.use(
  createProxyMiddleware({
    pathFilter: "/graphql/pagos",
    target: PAGO_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/graphql/pagos": "/graphql" }
  })
);

router.use(
  createProxyMiddleware({
    pathFilter: "/api/notificaciones",
    target: NOTIFICACION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/notificaciones": "/notificaciones" }
  })
);

export default router;