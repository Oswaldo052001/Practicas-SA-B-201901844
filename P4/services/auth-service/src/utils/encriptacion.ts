import crypto from "crypto";

const ALGORITMO = "aes-256-cbc";
const clave = crypto
  .createHash("sha256")
  .update(process.env.AES_SECRET_KEY || "clave_por_defecto")
  .digest();

export function encriptar(texto: string): string {
  const iv = crypto.randomBytes(16);
  const cifrador = crypto.createCipheriv(ALGORITMO, clave, iv);
  const cifrado = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return `${iv.toString("hex")}:${cifrado.toString("hex")}`;
}

export function desencriptar(textoCifrado: string): string {
  const [ivHex, cifradoHex] = textoCifrado.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const cifrado = Buffer.from(cifradoHex, "hex");
  const descifrador = crypto.createDecipheriv(ALGORITMO, clave, iv);
  const descifrado = Buffer.concat([descifrador.update(cifrado), descifrador.final()]);
  return descifrado.toString("utf8");
}

export function generarHashBusqueda(texto: string): string {
  return crypto.createHash("sha256").update(texto.toLowerCase().trim()).digest("hex");
}
