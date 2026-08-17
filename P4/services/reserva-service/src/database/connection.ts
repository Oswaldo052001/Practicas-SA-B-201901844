import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

export async function inicializarBaseDeDatos(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      funcion_id INTEGER NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      creado_en TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS detalle_reserva (
      id SERIAL PRIMARY KEY,
      reserva_id INTEGER NOT NULL REFERENCES reservas(id),
      asiento_funcion_id INTEGER NOT NULL,
      precio_unitario NUMERIC(10,2) NOT NULL
    );
  `);
}
