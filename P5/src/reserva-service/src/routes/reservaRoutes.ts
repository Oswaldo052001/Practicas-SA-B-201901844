import { Router } from "express";
import { ReservaController } from "../controllers/ReservaController";

const router = Router();
const controller = new ReservaController();

router.post("/reservas", (req, res) => controller.crear(req, res));
router.get("/reservas/usuario/:usuarioId", (req, res) => controller.listar(req, res));

export default router;
