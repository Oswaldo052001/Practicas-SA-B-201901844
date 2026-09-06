// Practica 7: se extrae la conversion de fecha/hora a GMT-6
// (America/Guatemala) a un modulo aparte para poder probarla con una
// prueba unitaria pura, sin necesidad de una base de datos real.
function obtenerFechaGMT6(ahora) {
  return new Date(ahora.toLocaleString("en-US", { timeZone: "America/Guatemala" }));
}

module.exports = { obtenerFechaGMT6 };
