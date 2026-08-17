import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UsuarioRepository } from "../repositories/UsuarioRepository";
import { encriptar, desencriptar, generarHashBusqueda } from "../utils/encriptacion";
import { UsuarioPublico } from "../models/Usuario";

const SALT_ROUNDS = 10;

export class AuthService {
  constructor(private usuarioRepository: UsuarioRepository) {}

  async registrar(nombre: string, correo: string, password: string, rol: string) {
    const correo_hash = generarHashBusqueda(correo);
    const existente = await this.usuarioRepository.buscarPorCorreoHash(correo_hash);
    if (existente) {
      throw new Error("El correo ya esta registrado");
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const usuario = await this.usuarioRepository.crear({
      nombre_encriptado: encriptar(nombre),
      correo_encriptado: encriptar(correo),
      correo_hash,
      password_hash,
      rol
    });

    return this.aUsuarioPublico(usuario.id, nombre, correo, rol, usuario.activo);
  }

  async iniciarSesion(correo: string, password: string): Promise<{ usuario: UsuarioPublico; token: string }> {
    const correo_hash = generarHashBusqueda(correo);
    const usuario = await this.usuarioRepository.buscarPorCorreoHash(correo_hash);
    if (!usuario) {
      throw new Error("Credenciales invalidas");
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      throw new Error("Credenciales invalidas");
    }

    const nombre = desencriptar(usuario.nombre_encriptado);
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET as string,
      { expiresIn: Number(process.env.TIEMPO_VIDA_SEGUNDOS) }
    );

    return {
      usuario: this.aUsuarioPublico(usuario.id, nombre, correo, usuario.rol, usuario.activo),
      token
    };
  }

  async verificarToken(token: string): Promise<{ id: number; rol: string }> {
    return jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; rol: string };
  }

  async obtenerPerfil(id: number): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepository.buscarPorId(id);
    if (!usuario) {
      throw new Error("Usuario no encontrado");
    }
    return this.aUsuarioPublico(
      usuario.id,
      desencriptar(usuario.nombre_encriptado),
      desencriptar(usuario.correo_encriptado),
      usuario.rol,
      usuario.activo
    );
  }

  private aUsuarioPublico(id: number, nombre: string, correo: string, rol: string, activo: boolean): UsuarioPublico {
    return { id, nombre, correo, rol, activo };
  }
}
