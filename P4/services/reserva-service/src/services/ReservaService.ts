import { ReservaRepository } from "../repositories/ReservaRepository";
import { DatosCrearReserva } from "../models/Reserva";

export class ReservaService {
  constructor(private reservaRepository: ReservaRepository) {}

  async crearReserva(datos: DatosCrearReserva) {
    if (!datos.asientos || datos.asientos.length === 0) {
      throw new Error("La reserva debe incluir al menos un asiento");
    }

    const reserva = await this.reservaRepository.crear(datos.usuario_id, datos.funcion_id);

    for (const asiento of datos.asientos) {
      await this.reservaRepository.agregarDetalle(reserva.id, asiento.asiento_funcion_id, asiento.precio_unitario);
    }

    const detalles = await this.reservaRepository.listarDetalles(reserva.id);
    return { ...reserva, detalles };
  }

  async obtenerReserva(id: number) {
    const reserva = await this.reservaRepository.buscarPorId(id);
    if (!reserva) {
      throw new Error("Reserva no encontrada");
    }
    const detalles = await this.reservaRepository.listarDetalles(id);
    return { ...reserva, detalles };
  }

  async listarReservasDeUsuario(usuario_id: number) {
    return this.reservaRepository.listarPorUsuario(usuario_id);
  }

  async confirmarReserva(id: number) {
    await this.reservaRepository.actualizarEstado(id, "confirmada");
    return this.obtenerReserva(id);
  }

  async cancelarReserva(id: number) {
    await this.reservaRepository.actualizarEstado(id, "cancelada");
    return this.obtenerReserva(id);
  }
}
