const { Pool } = require("pg");
const amqp = require("amqplib");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "cronjobs_db",
});

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || "5672";
const RABBITMQ_USER = process.env.RABBITMQ_USER || "sa_admin";
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "changeme";
const QUEUE_RESUMEN = process.env.RABBITMQ_QUEUE_RESUMEN || "resumen-cronjobs";
const CONNECTION_URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

async function main() {
  // Consulta los registros generados por cronjob-registro y agrupa por hora.
  const resultado = await pool.query(`
    SELECT to_char(fecha_hora_gmt6, 'YYYY-MM-DD HH24:00') AS hora,
           COUNT(*) AS cantidad_ejecuciones
    FROM registros_ejecucion
    WHERE creado_en >= now() - interval '10 minutes'
    GROUP BY hora
    ORDER BY hora;
  `);

  if (resultado.rows.length === 0) {
    console.log("[cronjob-resumen] no hay registros nuevos en los ultimos 10 minutos, no se publica nada");
    await pool.end();
    return;
  }

  const connection = await amqp.connect(CONNECTION_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_RESUMEN, { durable: true });

  for (const fila of resultado.rows) {
    const mensaje = {
      hora: fila.hora,
      cantidadEjecuciones: Number(fila.cantidad_ejecuciones),
    };
    channel.sendToQueue(QUEUE_RESUMEN, Buffer.from(JSON.stringify(mensaje)), {
      persistent: true, // el mensaje sobrevive a un reinicio del broker
    });
    console.log("[cronjob-resumen] resumen publicado:", mensaje);
  }

  await channel.close();
  await connection.close();
  await pool.end();
}

main().catch((err) => {
  console.error("[cronjob-resumen] error:", err);
  process.exit(1);
});
