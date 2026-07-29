export type EstadoSolicitud = "registrada" | "en_proceso" | "finalizada";

export interface Solicitud {
  id: string;
  titulo: string;
  areaSolicitante: string;
  prioridad: number;
  costoEstimado: number;
  estado: EstadoSolicitud;
}

export interface CrearSolicitudDTO {
  titulo: string;
  areaSolicitante: string;
  prioridad: number;
  costoEstimado: number;
  estado: EstadoSolicitud;
}

export interface ActualizarEstadoDTO {
  estado: EstadoSolicitud;
}