import { Request, Response } from "express";
import { UsuarioService } from "../services/UsuarioService";
import { generarToken } from "../utils/jwt";
import { Rol } from "../models/Usuario";

const NOMBRE_COOKIE = "token";
const TIEMPO_VIDA_SEGUNDOS = Number(process.env.JWT_TIEMPO_VIDA_SEGUNDOS);
const TIEMPO_GRACIA_SEGUNDOS = Number(process.env.JWT_TIEMPO_GRACIA_SEGUNDOS);
const MAX_AGE_COOKIE_MS = (TIEMPO_VIDA_SEGUNDOS + TIEMPO_GRACIA_SEGUNDOS) * 1000;

export class AuthController {
  constructor(private usuarioService: UsuarioService) {}

  registrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, correo, password, rol } = req.body;

      if (!nombre || !correo || !password || !rol) {
        res.status(400).json({ error: "Todos los campos son obligatorios" });
        return;
      }

      const rolesValidos: Rol[] = ["admin", "cliente"];
      if (!rolesValidos.includes(rol)) {
        res.status(400).json({ error: "El rol debe ser admin o cliente" });
        return;
      }

      const usuario = await this.usuarioService.registrar({ nombre, correo, password, rol });

      res.status(201).json({
        mensaje: "Usuario registrado correctamente",
        id: usuario.id,
        rol: usuario.rol,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Error al registrar usuario";
      res.status(400).json({ error: mensaje });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { correo, password } = req.body;

      if (!correo || !password) {
        res.status(400).json({ error: "Correo y contrasena son obligatorios" });
        return;
      }

      const usuario = await this.usuarioService.validarCredenciales({ correo, password });
      const token = generarToken({ id: usuario.id, rol: usuario.rol });

      res.cookie(NOMBRE_COOKIE, token, {
        httpOnly: true,
        maxAge: MAX_AGE_COOKIE_MS,
      });

      res.status(200).json({
        mensaje: "Inicio de sesion exitoso",
        nombre: this.usuarioService.obtenerNombreDesencriptado(usuario),
        rol: usuario.rol,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Error al iniciar sesion";
      res.status(401).json({ error: mensaje });
    }
  };

  logout = (req: Request, res: Response): void => {
    res.clearCookie(NOMBRE_COOKIE);
    res.status(200).json({ mensaje: "Sesion cerrada correctamente" });
  };
}