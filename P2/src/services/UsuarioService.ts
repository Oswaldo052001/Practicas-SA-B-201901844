import bcrypt from "bcrypt";
import { UsuarioRepository } from "../repositories/UsuarioRepository";
import { UsuarioRegistro, UsuarioLogin, Usuario } from "../models/Usuario";
import { encriptar, desencriptar, hashCorreo } from "../utils/encriptacion";

const RONDAS_BCRYPT = 10;

export class UsuarioService {
  constructor(private usuarioRepository: UsuarioRepository) {}

  async registrar(datos: UsuarioRegistro): Promise<Usuario> {
    const correoHash = hashCorreo(datos.correo);

    const existente = await this.usuarioRepository.buscarPorCorreoHash(correoHash);
    if (existente) {
      throw new Error("Ya existe un usuario registrado con ese correo");
    }

    const nombreEncriptado = encriptar(datos.nombre);
    const correoEncriptado = encriptar(datos.correo);
    const passwordHash = await bcrypt.hash(datos.password, RONDAS_BCRYPT);

    return this.usuarioRepository.crear(
      nombreEncriptado,
      correoEncriptado,
      correoHash,
      passwordHash,
      datos.rol
    );
  }

  async validarCredenciales(datos: UsuarioLogin): Promise<Usuario> {
    const correoHash = hashCorreo(datos.correo);
    const usuario = await this.usuarioRepository.buscarPorCorreoHash(correoHash);

    if (!usuario) {
      throw new Error("Correo o contraseña incorrectos");
    }

    const passwordValido = await bcrypt.compare(datos.password, usuario.passwordHash);
    if (!passwordValido) {
      throw new Error("Correo o contraseña incorrectos");
    }

    return usuario;
  }

  obtenerNombreDesencriptado(usuario: Usuario): string {
    return desencriptar(usuario.nombre);
  }

  obtenerCorreoDesencriptado(usuario: Usuario): string {
    return desencriptar(usuario.correo);
  }
}