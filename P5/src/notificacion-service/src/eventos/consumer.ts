import { connect, NatsConnection, JetStreamManager, AckPolicy, StringCodec, createInbox } from "nats";
import { pool } from "../database/pool";
import { formatearMensajePago, formatearMensajeResumen } from "./formato";

// Practica 6: se reemplaza RabbitMQ por NATS JetStream, siguiendo la
// recomendacion del auxiliar sobre el broker de mensajeria (en la Practica
// 5 se habia usado RabbitMQ como alternativa a Kafka por consumo de
// memoria, pero no se siguio la recomendacion original de usar NATS).
//
// JetStream (la capa de persistencia de NATS) reproduce las mismas
// garantias que se usaban con RabbitMQ:
//  - stream con retencion (equivalente a "durable: true" en la cola)
//  - consumidor durable con ack explicito (equivalente a channel.ack/nack)
//  - "queue" en la suscripcion = varias replicas se reparten los mensajes,
//    igual que hacia prefetch(1) con multiples consumidores de RabbitMQ.
const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const NATS_USER = process.env.NATS_USER;
const NATS_PASSWORD = process.env.NATS_PASSWORD;

const STREAM_PAGOS = process.env.NATS_STREAM_PAGOS || "PAGOS";
const SUBJECT_PAGOS = process.env.NATS_SUBJECT_PAGOS || "eventos.pagos.confirmado";
const STREAM_CRONJOBS = process.env.NATS_STREAM_CRONJOBS || "CRONJOBS";
const SUBJECT_RESUMEN = process.env.NATS_SUBJECT_RESUMEN || "eventos.cronjobs.resumen";

const sc = StringCodec();
const SIETE_DIAS_NS = 7 * 24 * 60 * 60 * 1_000_000_000;

async function procesarEventoPago(payload: any): Promise<void> {
  const { reservaId, monto } = payload;
  const mensaje = formatearMensajePago({ reservaId, monto });
  await pool.query(
    "INSERT INTO notificaciones (reserva_id, monto, mensaje) VALUES ($1, $2, $3)",
    [reservaId, monto, mensaje]
  );
  console.log("[notificacion-service] notificacion registrada:", mensaje);
}

async function procesarResumenCronjob(payload: any): Promise<void> {
  const { hora, cantidadEjecuciones } = payload;
  await pool.query(
    "INSERT INTO resumenes_cronjobs (hora, cantidad_ejecuciones) VALUES ($1, $2)",
    [hora, cantidadEjecuciones]
  );
  console.log(`[notificacion-service] resumen almacenado: ${formatearMensajeResumen({ hora, cantidadEjecuciones })}`);
}

// Crea el stream si todavia no existe (primer arranque de la plataforma).
// Tanto los productores (pago-service, cronjob-resumen) como este
// consumidor llaman a esta misma logica, por si el consumidor no ha
// arrancado todavia cuando el primer productor publica.
async function asegurarStream(jsm: JetStreamManager, nombre: string, subject: string): Promise<void> {
  try {
    await jsm.streams.info(nombre);
  } catch {
    await jsm.streams.add({ name: nombre, subjects: [subject], max_age: SIETE_DIAS_NS });
    console.log(`[notificacion-service] stream JetStream "${nombre}" creado (subject "${subject}")`);
  }
}

async function conectarConReintentos(intentos = 15, esperaMs = 3000): Promise<NatsConnection> {
  for (let i = 1; i <= intentos; i++) {
    try {
      return await connect({
        servers: NATS_URL,
        user: NATS_USER,
        pass: NATS_PASSWORD,
        name: "notificacion-service-consumer",
        reconnectTimeWait: 2000,
        maxReconnectAttempts: -1,
      });
    } catch (err) {
      console.log(`[notificacion-service] NATS no disponible aun (intento ${i}/${intentos}), reintentando...`);
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }
  throw new Error("No se pudo conectar a NATS tras varios intentos");
}

export async function iniciarConsumidor(): Promise<void> {
  const nc = await conectarConReintentos();
  const jsm = await nc.jetstreamManager();
  const js = nc.jetstream();

  await asegurarStream(jsm, STREAM_PAGOS, SUBJECT_PAGOS);
  await asegurarStream(jsm, STREAM_CRONJOBS, SUBJECT_RESUMEN);

  const subPagos = await js.subscribe(SUBJECT_PAGOS, {
    config: { durable_name: "notificacion-pagos", ack_policy: AckPolicy.Explicit, deliver_subject: createInbox() },
    queue: "notificacion-pagos",
  });
  (async () => {
    for await (const msg of subPagos) {
      try {
        const payload = JSON.parse(sc.decode(msg.data));
        await procesarEventoPago(payload);
        // ack solo tras procesar exitosamente, tal como exige el enunciado.
        msg.ack();
      } catch (err) {
        console.error("[notificacion-service] error procesando pago, no se confirma el mensaje:", err);
        // nak: el mensaje vuelve a entregarse, no se pierde informacion.
        msg.nak();
      }
    }
  })();

  const subResumen = await js.subscribe(SUBJECT_RESUMEN, {
    config: { durable_name: "notificacion-resumen", ack_policy: AckPolicy.Explicit, deliver_subject: createInbox() },
    queue: "notificacion-resumen",
  });
  (async () => {
    for await (const msg of subResumen) {
      try {
        const payload = JSON.parse(sc.decode(msg.data));
        await procesarResumenCronjob(payload);
        msg.ack();
      } catch (err) {
        console.error("[notificacion-service] error procesando resumen, no se confirma el mensaje:", err);
        msg.nak();
      }
    }
  })();

  console.log(`[notificacion-service] consumidor JetStream activo en subjects: ${SUBJECT_PAGOS}, ${SUBJECT_RESUMEN}`);
}
