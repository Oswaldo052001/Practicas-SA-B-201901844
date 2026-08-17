export interface Reserva {
  id: number;
  usuario_id: number;
  funcion_id: number;
  estado: string;
  creado_en: Date;
}

export interface DetalleReserva {
  id: number;
  reserva_id: number;
  asiento_funcion_id: number;
  precio_unitario: number;
}

export interface DatosCrearReserva {
  usuario_id: number;
  funcion_id: number;
  asientos: { asiento_funcion_id: number; precio_unitario: number }[];
}
