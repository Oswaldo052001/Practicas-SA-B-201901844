import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { UsuarioService } from "../services/UsuarioService";
import { UsuarioRepository } from "../repositories/UsuarioRepository";

const usuarioRepository = new UsuarioRepository();
const usuarioService = new UsuarioService(usuarioRepository);
const authController = new AuthController(usuarioService);

const router = Router();

router.post("/registro", authController.registrar);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

export default router;