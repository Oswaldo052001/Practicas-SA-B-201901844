# Práctica 9 — Continuidad operativa y recuperación ante desastres

Universidad San Carlos de Guatemala, Software Avanzado, Sección B, carné
201901844.

## Estructura de esta carpeta

- `terraform-durable/` — recursos que **nunca** se destruyen entre
  pruebas: bucket de respaldos de Velero + cuenta de servicio dedicada.
  Se aplica una sola vez (ver runbook, paso 1).
- `terraform/` — el stack que se destruye y reconstruye en la prueba de
  DR: cluster GKE, namespace/cuotas/RBAC, ArgoCD, Velero (cliente) y
  Sealed Secrets, todo instalado por Terraform (`terraform apply` único,
  sin pasos manuales — ver `docs/diagrama-bootstrap.md`).
- `gitops-bootstrap/` — la Application raíz de ArgoCD que Terraform aplica
  como último paso del bootstrap (patrón app-of-apps).
- `docs/` — diagrama del bootstrap, runbook de recuperación, plantilla del
  informe de la prueba de DR.

## 4.1 Tabla de enlaces obligatoria

| Ítem | Enlace o dato requerido |
|---|---|
| Repositorio GitOps | https://github.com/Oswaldo052001/Practicas-SA-B-201901844-gitops |
| Aplicación raíz en ArgoCD | `sa-platform-root`, namespace `argocd` |
| Punto de entrada del bootstrap | `P9/terraform` (comando: `terraform apply`) — ver [`docs/runbook-recuperacion.md`](docs/runbook-recuperacion.md) |
| Backend remoto de Terraform | Google Cloud Storage, bucket `sa-201901844-tfstate`, prefix `p9/state` (stack `terraform-durable`: mismo bucket, prefix `p9/state-durable`) |
| Schedule de Velero | `schedule-datos` (namespace `sa-p8`, diario 03:00, retención 30 días) y `sealed-secrets-key-backup` (namespace `kube-system`, diario 04:00, retención 90 días); destino: bucket GCS `sa-201901844-velero-backups` |
| Reconstrucción cronometrada | `[PENDIENTE]` — `docs/informe-prueba-dr.md`, sección 3, tras ejecutar el runbook |
| Restauración de datos | `[PENDIENTE]` — `docs/informe-prueba-dr.md`, sección 4, tras ejecutar el runbook, paso 8 |
| Prueba de pérdida de nodo | `[PENDIENTE]` — evidencia (captura o log) del runbook, paso 7 |
| RTO y RPO declarados | Objetivo: RTO ≤ 30 min, RPO ≤ 24h (justificación en `docs/informe-prueba-dr.md`, sección 1). Medidos: `[PENDIENTE]` |
| Video demostrativo | `[PENDIENTE]` — URL y minutaje por punto |

**Nota:** el enunciado (sección 4.1) es explícito en que un enlace
ausente, roto o que requiera autenticación se califica con cero en ese
criterio, sin búsqueda adicional. Antes de la entrega, verificar que el
repositorio GitOps sea público y que cualquier ruta de evidencia
(capturas, logs) esté dentro de este mismo repositorio de código (no en
Google Drive ni en una carpeta local).

## Continúa en desarrollo

Ver `docs/runbook-recuperacion.md` para el procedimiento completo y
`docs/informe-prueba-dr.md` para la plantilla del informe — ambos
documentan exactamente qué falta ejecutar (la reconstrucción cronometrada,
la prueba de restauración de datos, la prueba de pérdida de nodo y el
video) porque esos pasos requieren correr comandos reales contra GCP y
Claude no tiene forma de ejecutarlos directamente en esta sesión.
