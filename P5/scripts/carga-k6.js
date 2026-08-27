import http from "k6/http";
import { check, sleep } from "k6";

// Prueba de carga contra el API Gateway (unico punto de entrada expuesto).
// Ejecutar con: k6 run -e GATEWAY_URL=http://localhost:30080 carga-k6.js
const GATEWAY_URL = __ENV.GATEWAY_URL || "http://localhost:30080";

export const options = {
  scenarios: {
    concurrencia_creciente: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "1m", target: 20 },
        { duration: "2m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "1m", target: 20 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const res = http.get(`${GATEWAY_URL}/api/notificaciones/notificaciones`);
  check(res, {
    "status es 200": (r) => r.status === 200,
  });
  sleep(1);
}

// Reporte minimo requerido (RPS, latencia p95, porcentaje de error):
// k6 imprime estas metricas automaticamente al finalizar la corrida en la
// seccion "http_req_duration" (p95) y "http_reqs" (para calcular RPS) y
// "http_req_failed" (tasa de error). Copiar esa salida a docs/05-resultados-carga.md.
