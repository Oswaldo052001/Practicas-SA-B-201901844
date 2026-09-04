const { Pool } = require("pg");
const { connect, StringCodec } = require("nats");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "cronjobs_db",
});

// Practica 6: se reemplaza el productor RabbitMQ por NATS JetStream,
// siguiendo la recomendacion del auxiliar sobre el broker de mensajeria.
const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const NATS_USER = process.env.NATS_USER;
const NATS_PASSWORD = process.env.NATS_PASSWORD;
const STREAM_CRONJOBS = process.env.NATS_STREAM_CRONJOBS || "CRONJOBS";
const SUBJECT_RESUMEN = process.env.NATS_SUBJECT_RESUMEN || "eventos.cronjobs.resumen";
const SIETE_DIAS_NS = 7 * 24 * 60 * 60 * 1_000_000_000;

const sc = StringCodec();

async function asegurarStream(jsm) {
  try {
    await jsm.streams.info(STREAM_CRONJOBS);
  } catch {
    await jsm.streams.add({ name: STREAM_CRONJOBS, subjects: [SUBJECT_RESUMEN], max_age: SIETE_DIAS_NS });
    console.log(`[cronjob-resumen] stream JetStream "${STREAM_CRONJOBS}" creado (subject "${SUBJECT_RESUMEN}")`);
  }
}

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

  const nc = await connect({ servers: NATS_URL, user: NATS_USER, pass: NATS_PASSWORD, name: "cronjob-resumen" });
  const jsm = await nc.jetstreamManager();
  await asegurarStream(jsm);
  const js = nc.jetstream();

  for (const fila of resultado.rows) {
    const mensaje = {
      hora: fila.hora,
      cantidadEjecuciones: Number(fila.cantidad_ejecuciones),
    };
    // js.publish espera el ack de persistencia del servidor antes de
    // resolver la promesa: publicacion asincrona (no bloquea al productor
    // en espera de que notificacion-service lo consuma) pero con
    // confirmacion de durabilidad, equivalente al "persistent: true" que
    // se usaba con RabbitMQ.
    await js.publish(SUBJECT_RESUMEN, sc.encode(JSON.stringify(mensaje)));
    console.log("[cronjob-resumen] resumen publicado:", mensaje);
  }

  await nc.drain();
  await pool.end();
}

main().catch((err) => {
  console.error("[cronjob-resumen] error:", err);
  process.exit(1);
});
