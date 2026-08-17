import "dotenv/config";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import reservaRoutes from "./routes/reservaRoutes";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { inicializarBaseDeDatos } from "./database/connection";

async function iniciar() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/reservas", reservaRoutes);

  app.get("/health", (_req, res) => {
    res.status(200).json({ estado: "activo", servicio: "reserva-service" });
  });

  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  // @apollo/server/express4 tipa sus handlers para Express 4. Este proyecto usa
  // Express 5.2.1 por convencion del curso; en tiempo de ejecucion la firma es
  // compatible, por eso se castea unicamente para evitar el conflicto de tipos.
  app.use("/graphql", express.json(), expressMiddleware(apolloServer) as unknown as express.RequestHandler);

  await inicializarBaseDeDatos();

  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`reserva-service escuchando en el puerto ${PORT}`);
    console.log(`GraphQL disponible en /graphql`);
  });
}

iniciar().catch((error) => {
  console.error("Error al iniciar reserva-service", error);
  process.exit(1);
});
