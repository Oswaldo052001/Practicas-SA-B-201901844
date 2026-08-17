import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import { inicializarBaseDeDatos } from "./database/connection";

const app = express();

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/", authRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ estado: "activo", servicio: "auth-service" });
});

const PORT = process.env.PORT || 3001;

inicializarBaseDeDatos()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`auth-service escuchando en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error al inicializar la base de datos", error);
    process.exit(1);
  });
