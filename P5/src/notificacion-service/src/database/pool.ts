import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "notificacion_db",
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id SERIAL PRIMARY KEY,
      reserva_id INTEGER,
      monto NUMERIC(10,2),
      mensaje VARCHAR(300) NOT NULL,
      enviado_en TIMESTAMP NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS resumenes_cronjobs (
      id SERIAL PRIMARY KEY,
      hora VARCHAR(20) NOT NULL,
      cantidad_ejecuciones INTEGER NOT NULL,
      recibido_en TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}
