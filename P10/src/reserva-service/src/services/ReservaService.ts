import { ReservaRepository } from "../repositories/ReservaRepository";

export class ReservaService {
  private repo = new ReservaRepository();

  async crearReserva(usuarioId: number, funcionId: number, asientos: number) {
    if (asientos <= 0) {
      throw new Error("La cantidad de asientos debe ser mayor a cero");
    }
    return this.repo.crear(usuarioId, funcionId, asientos);
  }

  async listarReservas(usuarioId: number) {
    return this.repo.listarPorUsuario(usuarioId);
  }

  async confirmarPago(reservaId: number) {
    const reserva = await this.repo.buscarPorId(reservaId);
    if (!reserva) {
      throw new Error("Reserva no encontrada");
    }
    await this.repo.actualizarEstado(reservaId, "pagada");
  }
}
