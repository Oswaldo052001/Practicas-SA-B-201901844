import { connect, NatsConnection, StringCodec } from "nats";
import { context, propagation, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { SERVICE_NAME } from "../observability";
import { natsDuration } from "../metrics";
import { log } from "../logger";

const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const NATS_USER = process.env.NATS_USER;
const NATS_PASSWORD = process.env.NATS_PASSWORD;
const TIMEOUT_MS = Number(process.env.NATS_REQUEST_TIMEOUT_MS || 5000);

const sc = StringCodec();
const tracer = trace.getTracer(SERVICE_NAME);
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
//
// Practica 10: NATS no es HTTP, asi que OpenTelemetry no propaga el contexto
// de traza solo. Como el gateway ya viaja los headers HTTP dentro del
// mensaje (campo "headers" de PeticionHttp), se inyecta ahi el header W3C
// "traceparent": el bridge del microservicio lo extrae y continua la MISMA
// traza (ver src/nats/httpBridge.ts de auth-service y reserva-service).
export async function pedirPorNats(servicio: string, peticion: PeticionHttp): Promise<RespuestaHttp> {
  const subject = `svc.${servicio}.http`;
  return tracer.startActiveSpan(
    `NATS request ${subject}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        "messaging.system": "nats",
        "messaging.destination.name": subject,
        "peer.service": servicio,
      },
    },
    async (span) => {
      const inicio = process.hrtime.bigint();
      let resultado = "ok";
      try {
        propagation.inject(context.active(), peticion.headers);
        const nc = await obtenerConexion();
        const respuesta = await nc.request(subject, sc.encode(JSON.stringify(peticion)), { timeout: TIMEOUT_MS });
        const parseada = JSON.parse(sc.decode(respuesta.data)) as RespuestaHttp;
        span.setAttribute("http.response.status_code", parseada.status);
        if (parseada.status >= 500) {
          resultado = "error_5xx";
          span.setStatus({ code: SpanStatusCode.ERROR, message: `respuesta ${parseada.status} de ${servicio}` });
        }
        return parseada;
      } catch (err: any) {
        resultado = "timeout_o_error";
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        log("error", `sin respuesta de ${servicio} via NATS`, { subject, error: err.message });
        return {
          status: 504,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ error: `sin respuesta de ${servicio} via NATS (subject ${subject}): ${err.message}` }),
        };
      } finally {
        natsDuration.record(Number(process.hrtime.bigint() - inicio) / 1e9, { servicio, resultado });
        span.end();
      }
    }
  );
}
