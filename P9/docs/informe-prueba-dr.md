# Informe de la prueba de DR (plantilla, sección 4.2 del enunciado)

Universidad San Carlos de Guatemala, Software Avanzado, Sección B, carné
201901844. Máximo 2 páginas, seis campos exactos. **Pendiente de llenar
con los datos reales de la ejecución** (marcado `[PENDIENTE]` abajo) —
Claude no puede correr `terraform`/`kubectl`/`velero`, así que estos
valores los completa Oswaldo siguiendo
[`runbook-recuperacion.md`](runbook-recuperacion.md) y pegando aquí las
marcas de tiempo reales.

## 1. Objetivos declarados

- **RTO objetivo: 30 minutos.** Justificación: creación del cluster GKE
  (~6-8 min) + node pool (~2-3 min) + `helm_release` de ArgoCD, Velero y
  Sealed Secrets (~5 min en total) + sincronización de ArgoCD de
  postgresql/nats/7 microservicios (~5-8 min) + restauración manual de
  datos si aplica (paso aparte, no incluido en este RTO porque el runbook
  lo trata como una prueba independiente, sección 3.2 "Prueba de
  restauración de datos"). Se declara con margen (30 min) sobre la suma
  estimada (~20 min) porque un cluster GKE nuevo puede tardar más si GCP
  está bajo carga en la región.
- **RPO objetivo: 24 horas.** Justificación: el `Schedule` de Velero
  (`schedule-datos`, ver `bootstrap/velero-resources` en el repo GitOps)
  corre una vez al día (03:00). El volumen de escritura real de este
  sistema (laboratorio académico, sin tráfico de producción) no
  justifica el costo/complejidad de respaldos más frecuentes; en un
  sistema con escritura constante este objetivo tendría que bajar.

## 2. Escenario ejecutado

`[PENDIENTE]` — describir exactamente qué se destruyó y en qué orden
(ejemplo: "`terraform destroy` completo del stack `P9/terraform`,
incluyendo el cluster GKE, el node pool, ArgoCD, Velero y Sealed Secrets;
el stack `P9/terraform-durable` NO se tocó").

## 3. Tiempos medidos

`[PENDIENTE]` — Marca de tiempo A (inicio de `terraform apply` de
reconstrucción) y Marca de tiempo B (las 3 Applications de ArgoCD en
`Synced`/`Healthy`), copiadas del runbook. **RTO real = B − A.**

| Marca | Hora |
|---|---|
| A — inicio de `terraform apply` | `[PENDIENTE]` |
| B — ArgoCD Synced/Healthy | `[PENDIENTE]` |
| **RTO real** | `[PENDIENTE]` |

## 4. Pérdida medida

`[PENDIENTE]` — qué datos NO se recuperaron y por qué. Si se ejecutó la
prueba de restauración de datos (runbook, sección 3.2), indicar la hora
de creación del respaldo restaurado (`velero backup describe
<nombre>` → campo `Started`) contra la hora en que se truncaron/borraron
los datos a propósito. **RPO real = hora del borrado − hora del
respaldo usado.**

## 5. Puntos únicos de fallo detectados

`[PENDIENTE]` — completar con lo que la prueba reveló que NO estaba
cubierto. Candidatos a verificar durante la prueba real (dejar los que
apliquen, quitar los que no):

- El bucket de estado de Terraform (`sa-201901844-tfstate`) y el bucket
  de respaldos de Velero viven en el **mismo proyecto de GCP** que el
  cluster. Si se pierde el proyecto completo (no solo el cluster), no hay
  recuperación posible — la lección de Code Spaces 2014 (respaldos en la
  misma cuenta que los datos primarios) solo está parcialmente resuelta
  aquí (separación de *stack*/estado, no de *cuenta*).
- La restauración de la llave de Sealed Secrets depende de que el
  `Schedule` `sealed-secrets-key-backup` ya haya corrido al menos una vez
  antes del desastre. Si el cluster se destruye antes de la primera
  corrida (ej. mismo día del bootstrap inicial), no hay llave que
  restaurar y los `SealedSecret` existentes en el repo GitOps de un
  cluster anterior quedan indescifrables permanentemente.
- El hook de `pg_dumpall` (ver `values-p9-resilience.yaml`) depende de la
  variable de entorno `POSTGRES_PASSWORD` estar presente en el contenedor
  al momento del backup — no se validó en un entorno con
  autenticación distinta a la contraseña por variable de entorno.

## 6. Brecha y plan

`[PENDIENTE]` — comparar el RTO/RPO reales (secciones 3 y 4) contra los
objetivos declarados (sección 1) y explicar qué se haría para cerrar la
diferencia si el objetivo no se cumplió. Ejemplos de acciones típicas
(ajustar según lo que realmente pase): reducir el intervalo del
`Schedule` de Velero si el RPO real importa más que el costo de
almacenamiento adicional; usar un `node_count` o `machine_type` distinto
si la creación del node pool resultó ser el cuello de botella del RTO.
