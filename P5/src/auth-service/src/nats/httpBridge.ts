import { connect, NatsConnection, StringCodec } from "nats";
import http from "http";

// Practica 6: el api-gateway ya no llama por HTTP directo a este servicio
// (asi funcionaba en la Practica 5). En su lugar, este bridge se suscribe a
// un subject de NATS y reenvia la peticion, por loopback, al mismo servidor
// Express que ya escucha en localhost dentro del pod. Las rutas y
// controladores de auth-service NO cambian: solo cambia el transporte entre
// el gateway y este servicio, que ahora esta mediado por el broker.
const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const NATS_USER = process.env.NATS_USER;
const NATS_PASSWORD = process.env.NATS_PASSWORD;
const SERVICE_NAME = "auth-service";
const SUBJECT = `svc.${SERVICE_NAME}.http`;
const LOCAL_PORT = Number(process.env.PORT || 3001);

const sc = StringCodec();

interface PeticionHttp {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
}

interface RespuestaHttp {
  status: number;
  headers: Record<string, string>;
  body: string;
}

function reenviarLoopback(peticion: PeticionHttp): Promise<RespuestaHttp> {
  return new Promise((resolve) => {
    const opciones: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: LOCAL_PORT,
      path: peticion.path,
      method: peticion.method,
      headers: { ...peticion.headers, host: "127.0.0.1" },
    };
    const solicitud = http.request(opciones, (respuesta) => {
      const trozos: Buffer[] = [];
      respuesta.on("data", (c) => trozos.push(c));
      respuesta.on("end", () => {
        const headersLimpios: Record<string, string> = {};
        for (const [k, v] of Object.entries(respuesta.headers)) {
          if (typeof v === "string") headersLimpios[k] = v;
        }
        resolve({
          status: respuesta.statusCode || 500,
          headers: headersLimpios,
          body: Buffer.concat(trozos).toString("utf-8"),
        });
      });
    });
    solicitud.on("error", (err) => {
      resolve({
        status: 502,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: `bridge NATS no pudo alcanzar ${SERVICE_NAME} en loopback: ${err.message}` }),
      });
    });
    if (peticion.body) solicitud.write(peticion.body);
    solicitud.end();
  });
}

export async function iniciarBridgeNats(): Promise<NatsConnection> {
  const nc = await connect({
    servers: NATS_URL,
    user: NATS_USER,
    pass: NATS_PASSWORD,
    name: `${SERVICE_NAME}-bridge`,
    reconnectTimeWait: 2000,
    maxReconnectAttempts: -1,
  });

  console.log(`[${SERVICE_NAME}] conectado a NATS en ${NATS_URL}, escuchando subject "${SUBJECT}"`);

  // queue group: si hay varias replicas del pod, NATS reparte cada peticion
  // entre una sola de las instancias suscritas (balanceo de carga nativo
  // del broker, sin necesitar Service de Kubernetes para este trafico).
  const suscripcion = nc.subscribe(SUBJECT, { queue: `${SERVICE_NAME}-workers` });

  (async () => {
    for await (const msg of suscripcion) {
      try {
        const peticion = JSON.parse(sc.decode(msg.data)) as PeticionHttp;
        const respuesta = await reenviarLoopback(peticion);
        msg.respond(sc.encode(JSON.stringify(respuesta)));
      } catch (err: any) {
        msg.respond(
          sc.encode(JSON.stringify({ status: 500, headers: {}, body: JSON.stringify({ error: err.message }) }))
        );
      }
    }
  })();

  return nc;
}
