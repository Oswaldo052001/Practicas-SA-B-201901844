import { ISolicitudRepository } from "../repositories/ISolicitudRepository";
import { ISolicitudService } from "./ISolicitudService";
import { Solicitud, CrearSolicitudDTO, EstadoSolicitud } from "../models/Solicitud";
import { SolicitudNoEncontradaError, DatosInvalidosError } from "./errors";

const ESTADOS_VALIDOS: EstadoSolicitud[] = ["registrada", "en_proceso", "finalizada"];

export class SolicitudService implements ISolicitudService {
  constructor(private repositorio: ISolicitudRepository) {}

  private validarDatos(datos: CrearSolicitudDTO): void {
    if (!datos.titulo || datos.titulo.trim().length === 0) {
      throw new DatosInvalidosError("El titulo es obligatorio");
    }
    if (!datos.areaSolicitante || datos.areaSolicitante.trim().length === 0) {
      throw new DatosInvalidosError("El area solicitante es obligatoria");
    }
    if (datos.prioridad < 1 || datos.prioridad > 5) {
      throw new DatosInvalidosError("La prioridad debe estar entre 1 y 5");
    }
    if (datos.costoEstimado < 0) {
      throw new DatosInvalidosError("El costo estimado no puede ser negativo");
    }
    if (!ESTADOS_VALIDOS.includes(datos.estado)) {
      throw new DatosInvalidosError("El estado enviado no es valido");
    }
  }

  async listarSolicitudes(): Promise<Solicitud[]> {
    return this.repositorio.obtenerTodas();
  }

  async registrarSolicitud(datos: CrearSolicitudDTO): Promise<Solicitud> {
    this.validarDatos(datos);
    return this.repositorio.crear(datos);
  }

  async actualizarSolicitud(id: string, datos: CrearSolicitudDTO): Promise<Solicitud> {
    this.validarDatos(datos);
    const actualizada = await this.repositorio.actualizar(id, datos);
    if (!actualizada) {
      throw new SolicitudNoEncontradaError(id);
    }
    return actualizada;
  }

  async eliminarSolicitud(id: string): Promise<void> {
    const existe = await this.repositorio.obtenerPorId(id);
    if (!existe) {
      throw new SolicitudNoEncontradaError(id);
    }
    await this.repositorio.eliminar(id);
  }

  async cambiarEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud> {
    if (!ESTADOS_VALIDOS.includes(estado)) {
      throw new DatosInvalidosError("El estado enviado no es valido");
    }
    const actualizada = await this.repositorio.actualizarEstado(id, estado);
    if (!actualizada) {
      throw new SolicitudNoEncontradaError(id);
    }
    return actualizada;
  }
}