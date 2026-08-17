import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

export class AuthController {
  constructor(private authService: AuthService) {}

  registrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, correo, password, rol } = req.body;
      const usuario = await this.authService.registrar(nombre, correo, password, rol || "cliente");
      res.status(201).json({ usuario });
    } catch (error) {
      res.status(400).json({ mensaje: (error as Error).message });
    }
  };

  iniciarSesion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { correo, password } = req.body;
      const { usuario, token } = await this.authService.iniciarSesion(correo, password);

      res.cookie("token", token, {
        httpOnly: true,
        maxAge: Number(process.env.TIEMPO_VIDA_SEGUNDOS) * 1000
      });

      res.status(200).json({ usuario, token });
    } catch (error) {
      res.status(401).json({ mensaje: (error as Error).message });
    }
  };

  perfil = async (req: Request, res: Response): Promise<void> => {
    try {
      const idUsuario = (req as any).usuario.id;
      const usuario = await this.authService.obtenerPerfil(idUsuario);
      res.status(200).json({ usuario });
    } catch (error) {
      res.status(404).json({ mensaje: (error as Error).message });
    }
  };

  verificar = async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.body.token || req.cookies?.token;
      const datos = await this.authService.verificarToken(token);
      res.status(200).json({ valido: true, datos });
    } catch (error) {
      res.status(401).json({ valido: false, mensaje: "Token invalido o expirado" });
    }
  };
}
