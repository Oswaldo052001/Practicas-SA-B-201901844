import { Request, Response, NextFunction } from "express";
import { verificarTokenValido, verificarTokenDentroDeGracia, generarToken, PayloadJWT } from "../utils/jwt";

const NOMBRE_COOKIE = "token";
const TIEMPO_VIDA_SEGUNDOS = Number(process.env.JWT_TIEMPO_VIDA_SEGUNDOS);
const TIEMPO_GRACIA_SEGUNDOS = Number(process.env.JWT_TIEMPO_GRACIA_SEGUNDOS);
const MAX_AGE_COOKIE_MS = (TIEMPO_VIDA_SEGUNDOS + TIEMPO_GRACIA_SEGUNDOS) * 1000;

export interface RequestConUsuario extends Request {
  usuario?: PayloadJWT;
}

export function verificarAutenticacion(
  req: RequestConUsuario,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.[NOMBRE_COOKIE];

  if (!token) {
    res.status(401).json({ error: "No hay sesion activa" });
    return;
  }

  const payloadValido = verificarTokenValido(token);
  if (payloadValido) {
    req.usuario = payloadValido;
    next();
    return;
  }

  const payloadDentroDeGracia = verificarTokenDentroDeGracia(token);
  if (payloadDentroDeGracia) {
    const nuevoToken = generarToken(payloadDentroDeGracia);
    res.cookie(NOMBRE_COOKIE, nuevoToken, {
      httpOnly: true,
      maxAge: MAX_AGE_COOKIE_MS,
    });
    req.usuario = payloadDentroDeGracia;
    next();
    return;
  }

  res.status(401).json({ error: "Sesion expirada, inicia sesion de nuevo" });
}

export function verificarRol(...rolesPermitidos: string[]) {
  return (req: RequestConUsuario, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: "No hay sesion activa" });
      return;
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({ error: "No tienes permiso para acceder a este recurso" });
      return;
    }

    next();
  };
}