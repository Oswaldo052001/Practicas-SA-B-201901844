import { pool } from "../database/connection";
import { Reserva, DetalleReserva } from "../models/Reserva";

export class ReservaRepository {
  async crear(usuario_id: number, funcion_id: number): Promise<Reserva> {
    const resultado = await pool.query(
      `INSERT INTO reservas (usuario_id, funcion_id, estado) VALUES ($1, $2, 'pendiente') RETURNING *`,
      [usuario_id, funcion_id]
    );
    return resultado.rows[0];
  }

  async agregarDetalle(reserva_id: number, asiento_funcion_id: number, precio_unitario: number): Promise<DetalleReserva> {
    const resultado = await pool.query(
      `INSERT INTO detalle_reserva (reserva_id, asiento_funcion_id, precio_unitario) VALUES ($1, $2, $3) RETURNING *`,
      [reserva_id, asiento_funcion_id, precio_unitario]
    );
    return resultado.rows[0];
  }

  async buscarPorId(id: number): Promise<Reserva | null> {
    const resultado = await pool.query("SELECT * FROM reservas WHERE id = $1", [id]);
    return resultado.rows[0] || null;
  }

  async listarPorUsuario(usuario_id: number): Promise<Reserva[]> {
    const resultado = await pool.query("SELECT * FROM reservas WHERE usuario_id = $1 ORDER BY creado_en DESC", [usuario_id]);
    return resultado.rows;
  }

  async listarDetalles(reserva_id: number): Promise<DetalleReserva[]> {
    const resultado = await pool.query("SELECT * FROM detalle_reserva WHERE reserva_id = $1", [reserva_id]);
    return resultado.rows;
  }

  async actualizarEstado(id: number, estado: string): Promise<void> {
    await pool.query("UPDATE reservas SET estado = $1 WHERE id = $2", [estado, id]);
  }
}
