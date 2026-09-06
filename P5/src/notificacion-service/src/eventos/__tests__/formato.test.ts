import { formatearMensajePago, formatearMensajeResumen } from "../formato";

// Practica 7: pruebas unitarias del formateo de mensajes de notificacion.
// Son puramente logica de texto, sin NATS ni Postgres de por medio.
describe("formatearMensajePago", () => {
  it("arma el texto con el id de reserva y el monto", () => {
    expect(formatearMensajePago({ reservaId: 42, monto: 150.5 })).toBe(
      "Pago confirmado para la reserva 42 por Q150.5"
    );
  });
});

describe("formatearMensajeResumen", () => {
  it("arma el texto con la hora y la cantidad de ejecuciones", () => {
    expect(formatearMensajeResumen({ hora: "2026-09-06 14:00", cantidadEjecuciones: 3 })).toBe(
      "Resumen 2026-09-06 14:00: 3 ejecucion(es)"
    );
  });

  it("funciona con cero ejecuciones", () => {
    expect(formatearMensajeResumen({ hora: "2026-09-06 15:00", cantidadEjecuciones: 0 })).toBe(
      "Resumen 2026-09-06 15:00: 0 ejecucion(es)"
    );
  });
});
