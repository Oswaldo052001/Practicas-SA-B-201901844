import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const router = Router();
const controller = new AuthController();

router.post("/registro", (req, res) => controller.registrar(req, res));
router.post("/login", (req, res) => controller.login(req, res));

export default router;
