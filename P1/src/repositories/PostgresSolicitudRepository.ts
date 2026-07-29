import { Pool } from "pg";
import { ISolicitudRepository } from "./ISolicitudRepository";
import { Solicitud, CrearSolicitudDTO, EstadoSolicitud } from "../models/Solicitud";

export class PostgresSolicitudRepository implements ISolicitudRepository {
  constructor(private pool: Pool) {}

  private mapearFila(fila: any): Solicitud {
    return {
      id: fila.id,
      titulo: fila.titulo,
      areaSolicitante: fila.area_solicitante,
      prioridad: fila.prioridad,
      costoEstimado: Number(fila.costo_estimado),
      estado: fila.estado,
    };
  }

  async obtenerTodas(): Promise<Solicitud[]> {
    const resultado = await this.pool.query("SELECT * FROM solicitudes ORDER BY id");
    return resultado.rows.map(this.mapearFila);
  }

  async obtenerPorId(id: string): Promise<Solicitud | null> {
    const resultado = await this.pool.query("SELECT * FROM solicitudes WHERE id = $1", [id]);
    if (resultado.rows.length === 0) {
      return null;
    }
    return this.mapearFila(resultado.rows[0]);
  }

  async crear(datos: CrearSolicitudDTO): Promise<Solicitud> {
    const consulta = `
      INSERT INTO solicitudes (titulo, area_solicitante, prioridad, costo_estimado, estado)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const valores = [datos.titulo, datos.areaSolicitante, datos.prioridad, datos.costoEstimado, datos.estado];
    const resultado = await this.pool.query(consulta, valores);
    return this.mapearFila(resultado.rows[0]);
  }

  async actualizar(id: string, datos: CrearSolicitudDTO): Promise<Solicitud | null> {
    const consulta = `
      UPDATE solicitudes
      SET titulo = $1, area_solicitante = $2, prioridad = $3, costo_estimado = $4, estado = $5
      WHERE id = $6
      RETURNING *
    `;
    const valores = [datos.titulo, datos.areaSolicitante, datos.prioridad, datos.costoEstimado, datos.estado, id];
    const resultado = await this.pool.query(consulta, valores);
    if (resultado.rows.length === 0) {
      return null;
    }
    return this.mapearFila(resultado.rows[0]);
  }

  async actualizarEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud | null> {
    const resultado = await this.pool.query(
      "UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *",
      [estado, id]
    );
    if (resultado.rows.length === 0) {
      return null;
    }
    return this.mapearFila(resultado.rows[0]);
  }

  async eliminar(id: string): Promise<boolean> {
    const resultado = await this.pool.query("DELETE FROM solicitudes WHERE id = $1", [id]);
    return (resultado.rowCount ?? 0) > 0;
  }
}