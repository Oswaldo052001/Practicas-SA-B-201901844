import { pool } from "../database/pool";

export interface Usuario {
  id: number;
  correo: string;
  password_hash: string;
  rol: string;
}

export class UsuarioRepository {
  async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const resultado = await pool.query<Usuario>(
      "SELECT id, correo, password_hash, rol FROM usuarios WHERE correo = $1",
      [correo]
    );
    return resultado.rows[0] || null;
  }

  async crear(correo: string, passwordHash: string, rol: string): Promise<Usuario> {
    const resultado = await pool.query<Usuario>(
      "INSERT INTO usuarios (correo, password_hash, rol) VALUES ($1, $2, $3) RETURNING id, correo, password_hash, rol",
      [correo, passwordHash, rol]
    );
    return resultado.rows[0];
  }
}
