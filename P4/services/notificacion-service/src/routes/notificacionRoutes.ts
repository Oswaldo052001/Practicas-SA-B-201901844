import { Router } from "express";
import { NotificacionController } from "../controllers/NotificacionController";
import { NotificacionService } from "../services/NotificacionService";
import { NotificacionRepository } from "../repositories/NotificacionRepository";
import { CanalCorreoSimulado } from "../services/CanalCorreoSimulado";

const notificacionRepository = new NotificacionRepository();
const canalCorreo = new CanalCorreoSimulado();
const notificacionService = new NotificacionService(notificacionRepository, canalCorreo);
const notificacionController = new NotificacionController(notificacionService);

const router = Router();

router.post("/", notificacionController.crear);
router.get("/usuario/:usuarioId", notificacionController.listarPorUsuario);

export default router;
