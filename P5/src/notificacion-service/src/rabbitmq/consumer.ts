import amqp from "amqplib";
import { pool } from "../database/pool";

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || "5672";
const RABBITMQ_USER = process.env.RABBITMQ_USER || "sa_admin";
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "changeme";
const QUEUE_PAGOS = process.env.RABBITMQ_QUEUE_PAGOS || "pagos-procesados";
const QUEUE_RESUMEN = process.env.RABBITMQ_QUEUE_RESUMEN || "resumen-cronjobs";

const CONNECTION_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

async function procesarEventoPago(payload: any): Promise<void> {
  const { reservaId, monto } = payload;
  const mensaje = `Pago confirmado para la reserva ${reservaId} por Q${monto}`;
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
  console.log(
    `[notificacion-service] resumen almacenado: hora=${hora} ejecuciones=${cantidadEjecuciones}`
  );
}

// Conecta con reintentos: al arrancar el pod, RabbitMQ puede tardar unos
// segundos mas en estar listo que el propio proceso de Node.
async function conectarConReintentos(intentos = 15, esperaMs = 3000): Promise<amqp.ChannelModel> {
  for (let i = 1; i <= intentos; i++) {
    try {
      return await amqp.connect(CONNECTION_URL);
    } catch (err) {
      console.log(`[notificacion-service] RabbitMQ no disponible aun (intento ${i}/${intentos}), reintentando...`);
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }
  throw new Error("No se pudo conectar a RabbitMQ tras varios intentos");
}

export async function iniciarConsumidor(): Promise<void> {
  const connection = await conectarConReintentos();
  const channel = await connection.createChannel();

  // durable: true en assertQueue debe coincidir con como el productor
  // declaro la cola (pago-service tambien la declara durable).
  await channel.assertQueue(QUEUE_PAGOS, { durable: true });
  await channel.assertQueue(QUEUE_RESUMEN, { durable: true });

  // prefetch(1): procesa un mensaje a la vez antes de pedir el siguiente,
  // para no perder mensajes en memoria si el proceso cae a mitad de un lote.
  channel.prefetch(1);

  channel.consume(QUEUE_PAGOS, async (msg: amqp.ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await procesarEventoPago(payload);
      // ack solo tras procesar exitosamente, tal como exige el enunciado.
      channel.ack(msg);
    } catch (err) {
      console.error("[notificacion-service] error procesando pago, no se confirma el mensaje:", err);
      // nack con requeue=true: el mensaje vuelve a la cola para reintentarse,
      // no se pierde informacion.
      channel.nack(msg, false, true);
    }
  });

  channel.consume(QUEUE_RESUMEN, async (msg: amqp.ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await procesarResumenCronjob(payload);
      channel.ack(msg);
    } catch (err) {
      console.error("[notificacion-service] error procesando resumen, no se confirma el mensaje:", err);
      channel.nack(msg, false, true);
    }
  });

  console.log(`[notificacion-service] consumidor RabbitMQ activo en colas: ${QUEUE_PAGOS}, ${QUEUE_RESUMEN}`);
}
