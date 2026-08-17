import { pool } from "../database/connection";
import { Usuario } from "../models/Usuario";

export class UsuarioRepository {
  async crear(datos: {
    nombre_encriptado: string;
    correo_encriptado: string;
    correo_hash: string;
    password_hash: string;
    rol: string;
  }): Promise<Usuario> {
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre_encriptado, correo_encriptado, correo_hash, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [datos.nombre_encriptado, datos.correo_encriptado, datos.correo_hash, datos.password_hash, datos.rol]
    );
    return resultado.rows[0];
  }

  async buscarPorCorreoHash(correo_hash: string): Promise<Usuario | null> {
    const resultado = await pool.query("SELECT * FROM usuarios WHERE correo_hash = $1", [correo_hash]);
    return resultado.rows[0] || null;
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const resultado = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    return resultado.rows[0] || null;
  }

  async activarUsuario(id: number): Promise<void> {
    await pool.query("UPDATE usuarios SET activo = true WHERE id = $1", [id]);
  }
}
