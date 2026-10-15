import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { logins, registros } from "../metrics";
import { log } from "../logger";

const authService = new AuthService();

export class AuthController {
  async registrar(req: Request, res: Response) {
    try {
      const { correo, password, rol } = req.body;
      if (!correo || !password) {
        registros.add(1, { resultado: "rechazado" });
        return res.status(400).json({ error: "correo y password son obligatorios" });
      }
      const usuario = await authService.registrar(correo, password, rol);
      registros.add(1, { resultado: "exitoso" });
      log("info", "usuario registrado", { usuario_id: usuario.id, rol: usuario.rol });
      return res.status(201).json(usuario);
    } catch (err: any) {
      registros.add(1, { resultado: "rechazado" });
      log("warn", "registro rechazado", { motivo: err.message });
      return res.status(400).json({ error: err.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { correo, password } = req.body;
      if (!correo || !password) {
        logins.add(1, { resultado: "rechazado" });
        return res.status(400).json({ error: "correo y password son obligatorios" });
      }
      const token = await authService.login(correo, password);
      res.cookie("token", token, { httpOnly: true, maxAge: 3600 * 1000 });
      logins.add(1, { resultado: "exitoso" });
      log("info", "inicio de sesion exitoso");
      return res.status(200).json({ token });
    } catch (err: any) {
      logins.add(1, { resultado: "rechazado" });
      // Nunca se registra el correo ni la contrasena: solo el motivo.
      log("warn", "inicio de sesion rechazado", { motivo: err.message });
      return res.status(401).json({ error: err.message });
    }
  }
}
