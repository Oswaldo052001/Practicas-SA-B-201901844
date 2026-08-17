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
    CREATE TABLE IF NOT EXISTS notificaciones (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      tipo VARCHAR(50) NOT NULL,
      destinatario VARCHAR(150) NOT NULL,
      asunto VARCHAR(200) NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'enviado',
      enviado_en TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}
