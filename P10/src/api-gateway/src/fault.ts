// Practica 10 - Inyeccion de fallos controlada por GitOps.
//
// El fallo inducido de la Practica 8 fue un endpoint roto (/ready-check
// devolviendo 500). El de la Practica 10 es distinto: una version "degradada"
// del api-gateway que, ante trafico real de usuarios, agrega latencia y
// responde 500 a una fraccion de las peticiones /api/*. Se activa unicamente
// con variables de entorno que vienen de apps/sa-platform/values-p10-faults.yaml
// en el repo GitOps (por defecto, apagado): cambiar ese archivo cambia el pod
// template, Argo Rollouts crea un canary con la configuracion defectuosa y
// el AnalysisTemplate (consultas PromQL) lo revierte solo.
import { log } from "./logger";

export interface ResultadoFalloInyectado {
  provocarError: boolean;
}

function numeroDeEntorno(nombre: string): number {
  const valor = Number(process.env[nombre]);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

export async function aplicarFalloInyectado(ruta: string): Promise<ResultadoFalloInyectado> {
  const latenciaMs = numeroDeEntorno("FAULT_LATENCY_MS");
  const tasaError = Math.min(numeroDeEntorno("FAULT_ERROR_RATE"), 1);
  if (latenciaMs > 0) {
    await new Promise((resolver) => setTimeout(resolver, latenciaMs));
  }
  if (tasaError > 0 && Math.random() < tasaError) {
    log("error", "fallo inyectado en api-gateway (FAULT_ERROR_RATE)", { ruta, tasa_error: tasaError });
    return { provocarError: true };
  }
  return { provocarError: false };
}
