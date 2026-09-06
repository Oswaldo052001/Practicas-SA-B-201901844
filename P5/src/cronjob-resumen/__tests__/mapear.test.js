const { mapearFilaAResumen } = require("../mapear");

// Practica 7: prueba unitaria pura del mapeo de filas de Postgres al evento
// de resumen que se publica en NATS.
describe("mapearFilaAResumen", () => {
  it("convierte cantidad_ejecuciones (string) a numero y renombra a camelCase", () => {
    const fila = { hora: "2026-09-06 09:00", cantidad_ejecuciones: "5" };
    expect(mapearFilaAResumen(fila)).toEqual({ hora: "2026-09-06 09:00", cantidadEjecuciones: 5 });
  });

  it("funciona cuando cantidad_ejecuciones ya viene como numero", () => {
    const fila = { hora: "2026-09-06 10:00", cantidad_ejecuciones: 1 };
    expect(mapearFilaAResumen(fila)).toEqual({ hora: "2026-09-06 10:00", cantidadEjecuciones: 1 });
  });
});
