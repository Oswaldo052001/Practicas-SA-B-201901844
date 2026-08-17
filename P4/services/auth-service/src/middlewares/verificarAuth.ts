import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function verificarAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ mensaje: "No autenticado" });
    return;
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).usuario = datos;
    next();
  } catch {
    res.status(401).json({ mensaje: "Token invalido o expirado" });
  }
}
