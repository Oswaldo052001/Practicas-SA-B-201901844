import { pool } from "../database/pool";

export interface Reserva {
  id: number;
  usuario_id: number;
  funcion_id: number;
  asientos: number;
  estado: string;
}

export class ReservaRepository {
  async crear(usuarioId: number, funcionId: number, asientos: number): Promise<Reserva> {
    const resultado = await pool.query<Reserva>(
      "INSERT INTO reservas (usuario_id, funcion_id, asientos) VALUES ($1, $2, $3) RETURNING *",
      [usuarioId, funcionId, asientos]
    );
    return resultado.rows[0];
  }

  async listarPorUsuario(usuarioId: number): Promise<Reserva[]> {
    const resultado = await pool.query<Reserva>(
      "SELECT * FROM reservas WHERE usuario_id = $1 ORDER BY creado_en DESC",
      [usuarioId]
    );
    return resultado.rows;
  }

  async buscarPorId(id: number): Promise<Reserva | null> {
    const resultado = await pool.query<Reserva>("SELECT * FROM reservas WHERE id = $1", [id]);
    return resultado.rows[0] || null;
  }

  async actualizarEstado(id: number, estado: string): Promise<void> {
    await pool.query("UPDATE reservas SET estado = $1 WHERE id = $2", [estado, id]);
  }
}
