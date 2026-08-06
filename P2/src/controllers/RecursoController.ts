import { Response } from "express";
import { RequestConUsuario } from "../middlewares/autenticacion";

export class RecursoController {
  soloAdmin = (req: RequestConUsuario, res: Response): void => {
    res.status(200).json({
      mensaje: "Acceso permitido a la ruta exclusiva de administradores",
      usuario: req.usuario,
    });
  };

  adminYCliente = (req: RequestConUsuario, res: Response): void => {
    res.status(200).json({
      mensaje: "Acceso permitido a la ruta general",
      usuario: req.usuario,
    });
  };
}