import express from "express";
import { initSchema, pool } from "./database/pool";
import { iniciarConsumidor } from "./rabbitmq/consumer";

const PORT = Number(process.env.PORT || 3005);

async function main() {
  await initSchema();

  const app = express();
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      return res.status(200).json({ status: "ok", service: "notificacion-service" });
    } catch {
      return res.status(503).json({ status: "error", service: "notificacion-service" });
    }
  });

  app.get("/notificaciones", async (_req, res) => {
    const resultado = await pool.query("SELECT * FROM notificaciones ORDER BY enviado_en DESC LIMIT 50");
    res.status(200).json(resultado.rows);
  });

  app.get("/resumenes", async (_req, res) => {
    const resultado = await pool.query("SELECT * FROM resumenes_cronjobs ORDER BY recibido_en DESC LIMIT 50");
    res.status(200).json(resultado.rows);
  });

  app.listen(PORT, () => {
    console.log(`notificacion-service escuchando en puerto ${PORT}`);
  });

  // El consumidor RabbitMQ corre en paralelo al servidor HTTP dentro del mismo
  // proceso/pod, para no anadir un servicio adicional fuera del alcance
  // de la practica.
  iniciarConsumidor().catch((err) => {
    console.error("Error al iniciar el consumidor RabbitMQ:", err);
  });
}

main().catch((err) => {
  console.error("Error al iniciar notificacion-service:", err);
  process.exit(1);
});
