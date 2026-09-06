// Practica 7: se extrae a un modulo aparte la logica pura de formateo de
// mensajes de notificacion (sin tocar NATS ni Postgres) para poder cubrirla
// con pruebas unitarias rapidas, siguiendo la base de la piramide de
// pruebas. consumer.ts importa estas funciones en vez de construir los
// mensajes inline.
export interface EventoPago {
  reservaId: number;
  monto: number;
}

export interface EventoResumenCronjob {
  hora: string;
  cantidadEjecuciones: number;
}

export function formatearMensajePago(evento: EventoPago): string {
  return `Pago confirmado para la reserva ${evento.reservaId} por Q${evento.monto}`;
}

export function formatearMensajeResumen(evento: EventoResumenCronjob): string {
  return `Resumen ${evento.hora}: ${evento.cantidadEjecuciones} ejecucion(es)`;
}
