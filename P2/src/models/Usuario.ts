export type Rol = "admin" | "cliente";

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  correoHash: string;
  passwordHash: string;
  rol: Rol;
  creadoEn: Date;
}

export interface UsuarioRegistro {
  nombre: string;
  correo: string;
  password: string;
  rol: Rol;
}

export interface UsuarioLogin {
  correo: string;
  password: string;
}