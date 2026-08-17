import "dotenv/config";
import express from "express";
import cors from "cors";
import notificacionRoutes from "./routes/notificacionRoutes";
import { inicializarBaseDeDatos } from "./database/connection";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/notificaciones", notificacionRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ estado: "activo", servicio: "notificacion-service" });
});

const PORT = process.env.PORT || 3005;

inicializarBaseDeDatos()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`notificacion-service escuchando en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error al inicializar la base de datos", error);
    process.exit(1);
  });
