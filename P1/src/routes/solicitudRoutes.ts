import { Router } from "express";
import { SolicitudController } from "../controllers/SolicitudController";

export function crearSolicitudRoutes(controller: SolicitudController): Router {
  const router = Router();

  router.get("/solicitudes", controller.listar);
  router.post("/solicitudes", controller.crear);
  router.put("/solicitudes/:id", controller.actualizar);
  router.delete("/solicitudes/:id", controller.eliminar);
  router.patch("/solicitudes/:id/estado", controller.cambiarEstado);

  return router;
}