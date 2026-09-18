// Practica 8, criterio 2.5 - Validacion automatizada: prueba de carga con
// k6 contra api-gateway (unico punto de entrada publico del sistema).
//
// Umbrales y su justificacion:
//   - http_req_duration p(95) < 500ms: el SLA interno del equipo para
//     endpoints publicos de sa-platform es "95% de las peticiones bajo
//     medio segundo"; por encima de eso la experiencia se considera
//     degradada para produccion.
//   - http_req_failed rate < 5%: una tasa de error mayor al 5% indica que
//     la version nueva esta fallando de forma sistematica (crash, 5xx,
//     timeout), no un error aislado.
//
// Este mismo script (copiado, ver el ConfigMap api-gateway-k6-script en el
// repo GitOps) es el que ejecuta el Job del AnalysisTemplate
// "api-gateway-canary-check" en cada paso del canary: si estos umbrales no
// se cumplen contra el Service exclusivo del canary (api-gateway-canary),
// el AnalysisRun queda en Failed y Argo Rollouts revierte el despliegue
// automaticamente (criterio 2.4).
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

// Por defecto apunta al Service normal (para correrlo a mano con
// port-forward); dentro del cluster, el AnalysisTemplate sobreescribe
// TARGET_URL para apuntar especificamente al canary.
const TARGET = __ENV.TARGET_URL || 'http://localhost:3000/health';

export default function () {
  const res = http.get(TARGET);
  check(res, { 'status es 200': (r) => r.status === 200 });
}
