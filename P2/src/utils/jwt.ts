import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Rol } from "../models/Usuario";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
const TIEMPO_VIDA_SEGUNDOS = Number(process.env.JWT_TIEMPO_VIDA_SEGUNDOS);
const TIEMPO_GRACIA_SEGUNDOS = Number(process.env.JWT_TIEMPO_GRACIA_SEGUNDOS);

export interface PayloadJWT {
  id: number;
  rol: Rol;
}

export function generarToken(payload: PayloadJWT): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TIEMPO_VIDA_SEGUNDOS });
}

export function verificarTokenValido(token: string): PayloadJWT | null {
  try {
    return jwt.verify(token, JWT_SECRET) as PayloadJWT;
  } catch {
    return null;
  }
}

export function verificarTokenDentroDeGracia(token: string): PayloadJWT | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as PayloadJWT & {
      exp: number;
    };

    const ahoraEnSegundos = Math.floor(Date.now() / 1000);
    const segundosDesdeExpiracion = ahoraEnSegundos - payload.exp;

    const yaExpiro = segundosDesdeExpiracion > 0;
    const dentroDeGracia = segundosDesdeExpiracion <= TIEMPO_GRACIA_SEGUNDOS;

    if (yaExpiro && dentroDeGracia) {
      return { id: payload.id, rol: payload.rol };
    }

    return null;
  } catch {
    return null;
  }
}