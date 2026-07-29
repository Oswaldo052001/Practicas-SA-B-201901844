import { Solicitud, CrearSolicitudDTO, EstadoSolicitud } from "../models/Solicitud";

export interface ISolicitudService {
  listarSolicitudes(): Promise<Solicitud[]>;
  registrarSolicitud(datos: CrearSolicitudDTO): Promise<Solicitud>;
  actualizarSolicitud(id: string, datos: CrearSolicitudDTO): Promise<Solicitud>;
  eliminarSolicitud(id: string): Promise<void>;
  cambiarEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud>;
}