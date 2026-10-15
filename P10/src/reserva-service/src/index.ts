// Practica 10: este import DEBE ir primero (registra OpenTelemetry antes de
// que express/http/pg se carguen). Ver observability.ts.
import "./observability";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import reservaRoutes from "./routes/reservaRoutes";
import { typeDefs, resolvers } from "./graphql/schema";
import { initSchema, pool } from "./database/pool";
import { iniciarBridgeNats } from "./nats/httpBridge";
import { observabilidadHttp } from "./httpObservability";
import { registrarMetricasDelPool } from "./metrics";
import { log } from "./logger";

const PORT = Number(process.env.PORT || 3003);

async function main() {
  await initSchema();
  registrarMetricasDelPool(pool);

  const app = express();
  app.use(observabilidadHttp);
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      return res.status(200).json({ status: "ok", service: "reserva-service" });
    } catch {
      return res.status(503).json({ status: "error", service: "reserva-service" });
    }
  });

  app.use("/", reservaRoutes);

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use("/graphql", express.json(), expressMiddleware(apollo));

  app.listen(PORT, () => {
    log("info", `reserva-service escuchando en puerto ${PORT} (REST + GraphQL en /graphql)`);
  });

  // Practica 6: el api-gateway llega hasta aca via NATS (subject
  // svc.reserva-service.http), incluidas las peticiones GraphQL, que el
  // bridge reenvia por loopback a este mismo servidor Express+Apollo.
  await iniciarBridgeNats();
}

main().catch((err) => {
  log("error", "Error al iniciar reserva-service", { error: err.message });
  process.exit(1);
});
