// Practica 10 - Inyeccion de fallos controlada por GitOps (reserva-service).
//
// Simula una base de datos degradada: cada operacion de reservas espera
// FAULT_DB_DELAY_MS dentro de Postgres (SELECT pg_sleep, asi el span de pg en
// la traza es realmente el lento y la causa se ve en la traza) y falla con
// probabilidad FAULT_ERROR_RATE. Ambas variables vienen de
// apps/sa-platform/values-p10-faults.yaml en el repo GitOps; por defecto,
// apagado.
import { pool } from "./database/pool";

export class FalloInyectadoError extends Error {
  constructor(detalle: string) {
    super(detalle);
    this.name = "FalloInyectadoError";
  }
}

function numeroDeEntorno(nombre: string): number {
  const valor = Number(process.env[nombre]);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

export async function aplicarFalloInyectado(operacion: string): Promise<void> {
  const retrasoMs = numeroDeEntorno("FAULT_DB_DELAY_MS");
  const tasaError = Math.min(numeroDeEntorno("FAULT_ERROR_RATE"), 1);
  if (retrasoMs > 0) {
    await pool.query("SELECT pg_sleep($1)", [retrasoMs / 1000]);
  }
  if (tasaError > 0 && Math.random() < tasaError) {
    throw new FalloInyectadoError(
      `fallo inyectado: la base reserva_db no respondio a tiempo en "${operacion}" (FAULT_ERROR_RATE=${tasaError})`
    );
  }
}
