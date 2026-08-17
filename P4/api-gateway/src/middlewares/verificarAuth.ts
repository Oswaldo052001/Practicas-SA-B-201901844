import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function verificarAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ mensaje: "No autenticado" });
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
    next();
  } catch {
    res.status(401).json({ mensaje: "Token invalido o expirado" });
  }
}
