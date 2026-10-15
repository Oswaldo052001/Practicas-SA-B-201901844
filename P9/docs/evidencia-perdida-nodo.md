# Evidencia: prueba de pérdida de nodo (runbook, paso 7)

Resumen de lo observado durante la prueba (23 sep 2026), tomado de las salidas
de `kubectl` de esa sesión; no es un log crudo.

- Se eligió un nodo sin Postgres ni NATS (solo una réplica de `api-gateway` y
  pods de sistema) y se drenó con `kubectl drain --ignore-daemonsets
  --delete-emptydir-data`.
- Kubernetes reprogramó la réplica de `api-gateway` en otro nodo; el bucle de
  `curl` contra el punto de entrada siguió respondiendo 200 sin interrupción
  (RTO prácticamente inmediato para este criterio).
- Al terminar se ejecutó `kubectl uncordon` y el cluster quedó con 4 nodos
  `Ready`.
- Prerrequisito: `values-p9-resilience.yaml` fuerza `hpa.minReplicas: 2` en
  `api-gateway`; sin eso había una sola réplica y el HPA deshacía las 2.

Pendiente de agregar por el autor: captura de pantalla de `kubectl get pods
-o wide` antes y después del drain, en `P9/docs/`.
