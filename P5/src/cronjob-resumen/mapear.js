// Practica 7: se extrae a un modulo aparte la conversion de una fila cruda
// de Postgres (hora, cantidad_ejecuciones en snake_case y string) al evento
// que se publica en NATS (camelCase, cantidadEjecuciones numerico), para
// poder probarla con una prueba unitaria pura, sin base de datos ni NATS.
function mapearFilaAResumen(fila) {
  return {
    hora: fila.hora,
    cantidadEjecuciones: Number(fila.cantidad_ejecuciones),
  };
}

module.exports = { mapearFilaAResumen };
