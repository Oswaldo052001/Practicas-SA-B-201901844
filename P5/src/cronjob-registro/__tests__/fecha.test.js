const { obtenerFechaGMT6 } = require("../fecha");

// Practica 7: prueba unitaria pura de la conversion a GMT-6
// (America/Guatemala), sin base de datos.
describe("obtenerFechaGMT6", () => {
  it("resta 6 horas dentro del mismo dia", () => {
    const utc = new Date(Date.UTC(2026, 0, 15, 20, 30, 0));
    const resultado = obtenerFechaGMT6(utc);
    expect(resultado.getHours()).toBe(14);
    expect(resultado.getMinutes()).toBe(30);
    expect(resultado.getDate()).toBe(15);
  });

  it("retrocede al dia anterior cuando la resta cruza medianoche", () => {
    const utc = new Date(Date.UTC(2026, 0, 15, 2, 0, 0));
    const resultado = obtenerFechaGMT6(utc);
    expect(resultado.getDate()).toBe(14);
    expect(resultado.getHours()).toBe(20);
  });
});
