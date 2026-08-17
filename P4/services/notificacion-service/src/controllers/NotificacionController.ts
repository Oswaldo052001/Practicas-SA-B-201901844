import { Request, Response } from "express";
import { NotificacionService } from "../services/NotificacionService";

export class NotificacionController {
  constructor(private notificacionService: NotificacionService) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    try {
      const { usuario_id, tipo, destinatario, asunto, mensaje } = req.body;
      const notificacion = await this.notificacionService.notificar(usuario_id, tipo, destinatario, asunto, mensaje);
      res.status(201).json({ notificacion });
    } catch (error) {
      res.status(400).json({ mensaje: (error as Error).message });
    }
  };

  listarPorUsuario = async (req: Request, res: Response): Promise<void> => {
    const notificaciones = await this.notificacionService.listarPorUsuario(Number(req.params.usuarioId));
    res.status(200).json({ notificaciones });
  };
}
