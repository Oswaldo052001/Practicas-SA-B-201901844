import { pool } from "../database/connection";
import { Notificacion } from "../models/Notificacion";

export class NotificacionRepository {
  async crear(datos: { usuario_id: number; tipo: string; destinatario: string; asunto: string }): Promise<Notificacion> {
    const resultado = await pool.query(
      `INSERT INTO notificaciones (usuario_id, tipo, destinatario, asunto, estado)
       VALUES ($1, $2, $3, $4, 'enviado') RETURNING *`,
      [datos.usuario_id, datos.tipo, datos.destinatario, datos.asunto]
    );
    return resultado.rows[0];
  }

  async listarPorUsuario(usuario_id: number): Promise<Notificacion[]> {
    const resultado = await pool.query(
      "SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY enviado_en DESC",
      [usuario_id]
    );
    return resultado.rows;
  }
}
