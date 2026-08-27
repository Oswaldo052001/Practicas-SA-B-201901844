import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import reservaRoutes from "./routes/reservaRoutes";
import { typeDefs, resolvers } from "./graphql/schema";
import { initSchema, pool } from "./database/pool";

const PORT = Number(process.env.PORT || 3003);

async function main() {
  await initSchema();

  const app = express();
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
    console.log(`reserva-service escuchando en puerto ${PORT} (REST + GraphQL en /graphql)`);
  });
}

main().catch((err) => {
  console.error("Error al iniciar reserva-service:", err);
  process.exit(1);
});
