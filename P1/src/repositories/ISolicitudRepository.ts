import { Solicitud, CrearSolicitudDTO, EstadoSolicitud } from "../models/Solicitud";

export interface ISolicitudRepository {
  obtenerTodas(): Promise<Solicitud[]>;
  crear(datos: CrearSolicitudDTO): Promise<Solicitud>;
  actualizar(id: string, datos: CrearSolicitudDTO): Promise<Solicitud | null>;
  eliminar(id: string): Promise<boolean>;
  actualizarEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud | null>;
  obtenerPorId(id: string): Promise<Solicitud | null>;
}