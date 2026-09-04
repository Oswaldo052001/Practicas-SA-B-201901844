import { connect, NatsConnection, StringCodec } from "nats";

const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const NATS_USER = process.env.NATS_USER;
const NATS_PASSWORD = process.env.NATS_PASSWORD;
const TIMEOUT_MS = Number(process.env.NATS_REQUEST_TIMEOUT_MS || 5000);

const sc = StringCodec();
let conexion: Promise<NatsConnection> | null = null;

function obtenerConexion(): Promise<NatsConnection> {
  if (!conexion) {
    conexion = connect({
      servers: NATS_URL,
      user: NATS_USER,
      pass: NATS_PASSWORD,
      name: "api-gateway",
      reconnectTimeWait: 2000,
      maxReconnectAttempts: -1,
    });
  }
  return conexion;
}

export interface PeticionHttp {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface RespuestaHttp {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// Practica 6: el api-gateway ya no abre conexiones HTTP directas hacia los
// pods de los microservicios (asi funcionaba en la Practica 5 con
// http-proxy-middleware). En su lugar publica la peticion en NATS y espera
// la respuesta por request-reply del broker: el gateway no necesita conocer
// la IP/DNS del pod que finalmente la atiende, y el broker puede repartir
// la carga entre replicas (queue group) sin que el gateway se entere.
export async function pedirPorNats(servicio: string, peticion: PeticionHttp): Promise<RespuestaHttp> {
  const nc = await obtenerConexion();
  const subject = `svc.${servicio}.http`;
  try {
    const respuesta = await nc.request(subject, sc.encode(JSON.stringify(peticion)), { timeout: TIMEOUT_MS });
    return JSON.parse(sc.decode(respuesta.data)) as RespuestaHttp;
  } catch (err: any) {
    return {
      status: 504,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: `sin respuesta de ${servicio} via NATS (subject ${subject}): ${err.message}` }),
    };
  }
}
