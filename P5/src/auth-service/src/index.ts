import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import { initSchema, pool } from "./database/pool";
import { iniciarBridgeNats } from "./nats/httpBridge";

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(express.json());
app.use(cookieParser());

// Endpoint de salud usado por liveness, readiness y startup probes.
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.status(200).json({ status: "ok", service: "auth-service" });
  } catch (err) {
    return res.status(503).json({ status: "error", service: "auth-service" });
  }
});

app.use("/", authRoutes);

async function main() {
  await initSchema();
  // El servidor HTTP sigue escuchando en localhost: las probes de
  // Kubernetes y el bridge de NATS (loopback) lo usan. Lo que cambio en la
  // Practica 6 es que el api-gateway ya no le habla directo por la red del
  // cluster: ahora pasa siempre por NATS (ver src/nats/httpBridge.ts).
  app.listen(PORT, () => {
    console.log(`auth-service escuchando en puerto ${PORT}`);
  });

  await iniciarBridgeNats();
}

main().catch((err) => {
  console.error("Error al iniciar auth-service:", err);
  process.exit(1);
});
