import { Pool } from "pg";

// Todas las variables no sensibles vienen del ConfigMap (DB_HOST, DB_PORT,
// DB_USER, DB_NAME), la contrasena viene del Secret generado por el subchart
// de Bitnami postgresql (ver templates/deployment.yaml del subchart).
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "auth_db",
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      correo VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(200) NOT NULL,
      rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
      creado_en TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}
