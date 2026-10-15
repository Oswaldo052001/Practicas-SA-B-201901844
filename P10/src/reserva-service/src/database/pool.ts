import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "reserva_db",
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      funcion_id INTEGER NOT NULL,
      asientos INTEGER NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      creado_en TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}
