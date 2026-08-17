import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { AuthService } from "../services/AuthService";
import { UsuarioRepository } from "../repositories/UsuarioRepository";
import { verificarAuth } from "../middlewares/verificarAuth";

const usuarioRepository = new UsuarioRepository();
const authService = new AuthService(usuarioRepository);
const authController = new AuthController(authService);

const router = Router();

router.post("/registro", authController.registrar);
router.post("/login", authController.iniciarSesion);
router.post("/verificar", authController.verificar);
router.get("/perfil", verificarAuth, authController.perfil);

export default router;
