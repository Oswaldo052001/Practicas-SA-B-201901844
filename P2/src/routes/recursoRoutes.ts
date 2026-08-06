import { Router } from "express";
import { RecursoController } from "../controllers/RecursoController";
import { verificarAutenticacion, verificarRol } from "../middlewares/autenticacion";

const recursoController = new RecursoController();

const router = Router();

router.get("/admin/reporte", verificarAutenticacion, verificarRol("admin"), recursoController.soloAdmin);

router.get("/general/perfil", verificarAutenticacion, verificarRol("admin", "cliente"), recursoController.adminYCliente);

export default router;