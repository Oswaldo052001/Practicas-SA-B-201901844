import { Request, Response } from "express";
import { ReservaService } from "../services/ReservaService";

export class ReservaController {
  constructor(private reservaService: ReservaService) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    try {
      const reserva = await this.reservaService.crearReserva(req.body);
      res.status(201).json({ reserva });
    } catch (error) {
      res.status(400).json({ mensaje: (error as Error).message });
    }
  };

  obtener = async (req: Request, res: Response): Promise<void> => {
    try {
      const reserva = await this.reservaService.obtenerReserva(Number(req.params.id));
      res.status(200).json({ reserva });
    } catch (error) {
      res.status(404).json({ mensaje: (error as Error).message });
    }
  };

  listarPorUsuario = async (req: Request, res: Response): Promise<void> => {
    const reservas = await this.reservaService.listarReservasDeUsuario(Number(req.params.usuarioId));
    res.status(200).json({ reservas });
  };

  confirmar = async (req: Request, res: Response): Promise<void> => {
    try {
      const reserva = await this.reservaService.confirmarReserva(Number(req.params.id));
      res.status(200).json({ reserva });
    } catch (error) {
      res.status(404).json({ mensaje: (error as Error).message });
    }
  };

  cancelar = async (req: Request, res: Response): Promise<void> => {
    try {
      const reserva = await this.reservaService.cancelarReserva(Number(req.params.id));
      res.status(200).json({ reserva });
    } catch (error) {
      res.status(404).json({ mensaje: (error as Error).message });
    }
  };
}
