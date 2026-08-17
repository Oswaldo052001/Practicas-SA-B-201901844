export interface Usuario {
  id: number;
  nombre_encriptado: string;
  correo_encriptado: string;
  correo_hash: string;
  password_hash: string;
  rol: string;
  activo: boolean;
  creado_en: Date;
}

export interface UsuarioPublico {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}
