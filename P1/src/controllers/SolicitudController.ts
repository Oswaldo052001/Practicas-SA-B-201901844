import { Request, Response } from "express";
import { ISolicitudService } from "../services/ISolicitudService";
import { SolicitudNoEncontradaError, DatosInvalidosError } from "../services/errors";

export class SolicitudController {
  constructor(private service: ISolicitudService) {}

  private manejarError(error: unknown, res: Response): void {
    if (error instanceof SolicitudNoEncontradaError) {
      res.status(404).json({ mensaje: error.message });
      return;
    }
    if (error instanceof DatosInvalidosError) {
      res.status(400).json({ mensaje: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }

  listar = async (req: Request, res: Response): Promise<void> => {
    const solicitudes = await this.service.listarSolicitudes();
    res.status(200).json(solicitudes);
  };

  crear = async (req: Request, res: Response): Promise<void> => {
    try {
      const nueva = await this.service.registrarSolicitud(req.body);
      res.status(201).json(nueva);
    } catch (error) {
      this.manejarError(error, res);
    }
  };

    actualizar = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const actualizada = await this.service.actualizarSolicitud(req.params.id, req.body);
        res.status(200).json(actualizada);
    } catch (error) {
        this.manejarError(error, res);
    }
    };

    eliminar = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        await this.service.eliminarSolicitud(req.params.id);
        res.status(204).send();
    } catch (error) {
        this.manejarError(error, res);
    }
    };

    cambiarEstado = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const actualizada = await this.service.cambiarEstado(req.params.id, req.body.estado);
        res.status(200).json(actualizada);
    } catch (error) {
        this.manejarError(error, res);
    }
    };
}