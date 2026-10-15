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
| Reconstrucción cronometrada | [`docs/informe-prueba-dr.md`](docs/informe-prueba-dr.md), sección 3 (RTO ≈ 86 min, 14 oct 2026) |
| Restauración de datos | [`docs/informe-prueba-dr.md`](docs/informe-prueba-dr.md), sección 4, y [`docs/evidencia-restauracion-datos.md`](docs/evidencia-restauracion-datos.md) |
| Prueba de pérdida de nodo | [`docs/evidencia-perdida-nodo.md`](docs/evidencia-perdida-nodo.md) |
| RTO y RPO declarados | Objetivo: RTO ≤ 30 min, RPO ≤ 24h (justificación en `docs/informe-prueba-dr.md`, sección 1). Medidos: RTO ≈ 86 min (no cumplido), RPO < 50 min (cumplido) |
| Video demostrativo | `[PENDIENTE]` — URL y minutaje por punto |

**Nota:** el enunciado (sección 4.1) es explícito en que un enlace
ausente, roto o que requiera autenticación se califica con cero en ese
criterio, sin búsqueda adicional. Antes de la entrega, verificar que el
repositorio GitOps sea público y que cualquier ruta de evidencia
(capturas, logs) esté dentro de este mismo repositorio de código (no en
Google Drive ni en una carpeta local).

## Estado

La prueba de DR (reconstrucción, llave de Sealed Secrets, restauración de
datos y pérdida de nodo) se ejecutó y está documentada en
`docs/informe-prueba-dr.md`. Solo falta el video demostrativo.
