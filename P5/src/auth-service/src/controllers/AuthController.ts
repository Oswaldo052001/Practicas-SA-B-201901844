import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

export class AuthController {
  async registrar(req: Request, res: Response) {
    try {
      const { correo, password, rol } = req.body;
      if (!correo || !password) {
        return res.status(400).json({ error: "correo y password son obligatorios" });
      }
      const usuario = await authService.registrar(correo, password, rol);
      return res.status(201).json(usuario);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { correo, password } = req.body;
      if (!correo || !password) {
        return res.status(400).json({ error: "correo y password son obligatorios" });
      }
      const token = await authService.login(correo, password);
      res.cookie("token", token, { httpOnly: true, maxAge: 3600 * 1000 });
      return res.status(200).json({ token });
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }
  }
}
