import express from "express";
import pool from "./database/connection";
import { PostgresSolicitudRepository } from "./repositories/PostgresSolicitudRepository";
import { SolicitudService } from "./services/SolicitudService";
import { SolicitudController } from "./controllers/SolicitudController";
import { crearSolicitudRoutes } from "./routes/solicitudRoutes";

const app = express();
app.use(express.json());

const repositorio = new PostgresSolicitudRepository(pool);
const servicio = new SolicitudService(repositorio);
const controlador = new SolicitudController(servicio);

app.use("/api", crearSolicitudRoutes(controlador));

const puerto = process.env.PORT || 3000;

app.listen(puerto, () => {
  console.log(`Servidor corriendo en el puerto ${puerto}`);
});