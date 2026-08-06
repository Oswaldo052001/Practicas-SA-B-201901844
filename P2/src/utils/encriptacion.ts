import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ALGORITMO = "aes-256-cbc";
const CLAVE = Buffer.from(process.env.AES_SECRET_KEY as string, "hex");

export function encriptar(texto: string): string {
  const iv = crypto.randomBytes(16);
  const cifrador = crypto.createCipheriv(ALGORITMO, CLAVE, iv);
  const cifrado = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return `${iv.toString("hex")}:${cifrado.toString("hex")}`;
}

export function desencriptar(textoCifrado: string): string {
  const [ivHex, datosHex] = textoCifrado.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const datos = Buffer.from(datosHex, "hex");
  const descifrador = crypto.createDecipheriv(ALGORITMO, CLAVE, iv);
  const descifrado = Buffer.concat([descifrador.update(datos), descifrador.final()]);
  return descifrado.toString("utf8");
}

export function hashCorreo(correo: string): string {
  return crypto.createHash("sha256").update(correo.toLowerCase().trim()).digest("hex");
}