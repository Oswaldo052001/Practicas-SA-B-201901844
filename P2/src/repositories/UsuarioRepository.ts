import { pool } from "../database/conexion";
import { Usuario, Rol } from "../models/Usuario";

interface FilaUsuario {
  id: number;
  nombre: string;
  correo: string;
  correo_hash: string;
  password_hash: string;
  rol: Rol;
  creado_en: Date;
}

function mapearFila(fila: FilaUsuario): Usuario {
  return {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
    correoHash: fila.correo_hash,
    passwordHash: fila.password_hash,
    rol: fila.rol,
    creadoEn: fila.creado_en,
  };
}

export class UsuarioRepository {
  async crear(
    nombreEncriptado: string,
    correoEncriptado: string,
    correoHash: string,
    passwordHash: string,
    rol: Rol
  ): Promise<Usuario> {
    const resultado = await pool.query<FilaUsuario>(
      `INSERT INTO usuarios (nombre, correo, correo_hash, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombreEncriptado, correoEncriptado, correoHash, passwordHash, rol]
    );
    return mapearFila(resultado.rows[0]);
  }

  async buscarPorCorreoHash(correoHash: string): Promise<Usuario | null> {
    const resultado = await pool.query<FilaUsuario>(
      "SELECT * FROM usuarios WHERE correo_hash = $1",
      [correoHash]
    );
    if (resultado.rows.length === 0) {
      return null;
    }
    return mapearFila(resultado.rows[0]);
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const resultado = await pool.query<FilaUsuario>(
      "SELECT * FROM usuarios WHERE id = $1",
      [id]
    );
    if (resultado.rows.length === 0) {
      return null;
    }
    return mapearFila(resultado.rows[0]);
  }
}