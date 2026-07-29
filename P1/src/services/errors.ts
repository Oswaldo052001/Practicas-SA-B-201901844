export class SolicitudNoEncontradaError extends Error {
  constructor(id: string) {
    super(`No se encontro la solicitud con id ${id}`);
    this.name = "SolicitudNoEncontradaError";
  }
}

export class DatosInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosInvalidosError";
  }
}