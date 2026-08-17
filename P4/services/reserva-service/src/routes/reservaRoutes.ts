import { Router } from "express";
import { ReservaController } from "../controllers/ReservaController";
import { ReservaService } from "../services/ReservaService";
import { ReservaRepository } from "../repositories/ReservaRepository";

const reservaRepository = new ReservaRepository();
const reservaService = new ReservaService(reservaRepository);
const reservaController = new ReservaController(reservaService);

const router = Router();

router.post("/", reservaController.crear);
router.get("/:id", reservaController.obtener);
router.get("/usuario/:usuarioId", reservaController.listarPorUsuario);
router.patch("/:id/confirmar", reservaController.confirmar);
router.patch("/:id/cancelar", reservaController.cancelar);

export default router;
export { reservaService };
