// Tabla de enrutamiento del api-gateway hacia los microservicios via NATS
// request-reply (ver src/nats/natsRpcClient.ts). Se extrajo a este modulo
// aparte en la Practica 7 para poder probarla con pruebas unitarias sin
// tener que levantar el servidor Express completo (piramide de pruebas:
// base ancha de unitarias sobre la logica pura de reescritura de rutas).
//
// Practica 4/5: cada regla usaba http-proxy-middleware con pathFilter +
// pathRewrite apuntando a la URL interna del servicio. Practica 6/7: la
// misma tabla de rutas, pero en vez de un target HTTP, cada regla apunta al
// "servicio" NATS que debe resolverla (subject svc.<servicio>.http).
export interface Ruta {
  prefijo: string;
  servicio: string;
  reescribirPath: (path: string) => string;
}

export const rutas: Ruta[] = [
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

// Devuelve la primera regla cuyo prefijo calza con el path recibido, o
// undefined si ninguna aplica (el llamador responde 404 en ese caso).
export function encontrarRuta(path: string): Ruta | undefined {
  return rutas.find((r) => path.startsWith(r.prefijo));
}
