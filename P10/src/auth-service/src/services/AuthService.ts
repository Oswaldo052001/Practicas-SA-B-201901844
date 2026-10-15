import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UsuarioRepository } from "../repositories/UsuarioRepository";

const JWT_SECRET = process.env.JWT_SECRET || "clave-dev-solo-para-pruebas-locales";

export class AuthService {
  private repo = new UsuarioRepository();

  async registrar(correo: string, password: string, rol: string = "cliente") {
    const existente = await this.repo.buscarPorCorreo(correo);
    if (existente) {
      throw new Error("El correo ya esta registrado");
    }
    const hash = await bcrypt.hash(password, 10);
    const usuario = await this.repo.crear(correo, hash, rol);
    return { id: usuario.id, correo: usuario.correo, rol: usuario.rol };
  }

  async login(correo: string, password: string) {
    const usuario = await this.repo.buscarPorCorreo(correo);
    if (!usuario) {
      throw new Error("Credenciales invalidas");
    }
    const coincide = await bcrypt.compare(password, usuario.password_hash);
    if (!coincide) {
      throw new Error("Credenciales invalidas");
    }
    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    return token;
  }

  verificarToken(token: string) {
    return jwt.verify(token, JWT_SECRET);
  }
}
