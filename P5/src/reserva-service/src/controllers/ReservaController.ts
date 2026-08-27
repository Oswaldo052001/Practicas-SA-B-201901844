import { Request, Response } from "express";
import { ReservaService } from "../services/ReservaService";

const service = new ReservaService();

export class ReservaController {
  async crear(req: Request, res: Response) {
    try {
      const { usuarioId, funcionId, asientos } = req.body;
      const reserva = await service.crearReserva(usuarioId, funcionId, asientos);
      return res.status(201).json(reserva);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async listar(req: Request, res: Response) {
    const usuarioId = Number(req.params.usuarioId);
    const reservas = await service.listarReservas(usuarioId);
    return res.status(200).json(reservas);
  }
}
