import { Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { ReservaService } from "../services/ReservaService";
import { FalloInyectadoError } from "../fault";
import { reservas } from "../metrics";
import { log } from "../logger";

const service = new ReservaService();

export class ReservaController {
  async crear(req: Request, res: Response) {
    try {
      const { usuarioId, funcionId, asientos } = req.body;
      const reserva = await service.crearReserva(usuarioId, funcionId, asientos);
      reservas.add(1, { resultado: "creada" });
      log("info", "reserva creada", { reserva_id: reserva.id, usuario_id: usuarioId, funcion_id: funcionId, asientos });
      return res.status(201).json(reserva);
    } catch (err: any) {
      if (err instanceof FalloInyectadoError) {
        // Fallo del lado del servidor (no del cliente): 503, cuenta contra el SLO.
        reservas.add(1, { resultado: "error" });
        trace.getActiveSpan()?.recordException(err);
        log("error", "no se pudo crear la reserva", { error: err.message });
        return res.status(503).json({ error: err.message });
      }
      reservas.add(1, { resultado: "rechazada" });
      log("warn", "reserva rechazada", { motivo: err.message });
      return res.status(400).json({ error: err.message });
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const usuarioId = Number(req.params.usuarioId);
      const lista = await service.listarReservas(usuarioId);
      return res.status(200).json(lista);
    } catch (err: any) {
      if (err instanceof FalloInyectadoError) {
        trace.getActiveSpan()?.recordException(err);
        log("error", "no se pudieron listar las reservas", { error: err.message });
        return res.status(503).json({ error: err.message });
      }
      throw err;
    }
  }
}
