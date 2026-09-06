const { Pool } = require("pg");
const { obtenerFechaGMT6 } = require("./fecha");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "cronjobs_db",
});

const CARNE = process.env.CARNE_ESTUDIANTE || "201901844";

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros_ejecucion (
      id SERIAL PRIMARY KEY,
      carne VARCHAR(20) NOT NULL,
      fecha_hora_gmt6 TIMESTAMP NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  // Fecha y hora en GMT-6 (America/Guatemala), independientemente de la zona
  // horaria del contenedor donde corre el pod.
  const ahora = new Date();
  const fechaGMT6 = obtenerFechaGMT6(ahora);

  await pool.query(
    "INSERT INTO registros_ejecucion (carne, fecha_hora_gmt6) VALUES ($1, $2)",
    [CARNE, fechaGMT6]
  );

  console.log(
    `[cronjob-registro] registro insertado: carne=${CARNE} fecha_hora_gmt6=${fechaGMT6.toISOString()}`
  );

  await pool.end();
}

main().catch((err) => {
  console.error("[cronjob-registro] error:", err);
  process.exit(1);
});
