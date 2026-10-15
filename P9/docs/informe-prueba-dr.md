# Informe de la prueba de DR

Universidad San Carlos de Guatemala, Software Avanzado, Sección B, carné
201901844. Los pasos para repetir la prueba están en
[`runbook-recuperacion.md`](runbook-recuperacion.md). Todas las horas son
hora local de Guatemala (UTC-6) salvo que se indique UTC.

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

Se sembró un usuario de prueba real (`prueba.dr@example.com`, creado por la
API) y se lanzó un respaldo manual `backup-pre-dr-test` (snapshot
2026-09-24 03:57:20 UTC, 2/2 volúmenes). Después se ejecutó `terraform
destroy` completo del stack `P9/terraform` (cluster GKE, node pool, ArgoCD,
Velero y Sealed Secrets). `P9/terraform-durable` (bucket de respaldos y
cuenta de servicio) no se tocó. La reconstrucción medida es la del
2026-10-14: un `terraform apply` sobre el proyecto vacío, seguido de la
restauración de la llave de Sealed Secrets y de los datos desde Velero.

## 3. Tiempos medidos

| Marca | Hora (14 oct 2026) |
|---|---|
| A — inicio de `terraform apply` | ≈ 17:01 (derivada: el cluster se creó a las 17:02:34) |
| B — 3 Applications de ArgoCD en `Synced`/`Healthy` | 18:27:06 (primera observación) |
| **RTO real** | **≈ 86 min** (objetivo: 30 min, no se cumplió) |

La marca A se calculó a partir de la hora de creación del cluster
(`gcloud container clusters describe`) porque la línea impresa por el script
no quedó en el log conservado. Dónde se fue el tiempo: Terraform dejó el
cluster y las Applications creadas en ≈ 33 min (17:01 a 17:34, incluyendo un
segundo `apply` por el kubeconfig desactualizado); `sa-platform` quedó
`OutOfSync` otros ≈ 35 min por CRDs faltantes (Kyverno y Argo Rollouts); y ≈ 10
min más por la llave de Sealed Secrets. Esos tres cortes fueron
intervenciones manuales (sección 5), no tiempo de infraestructura.

## 4. Pérdida medida

Datos recuperados: el usuario `prueba.dr@example.com` reapareció en
`auth_db.usuarios` (1 fila, `creado_en` 2026-09-24 03:56:58 UTC), restaurado
desde el disco creado a partir del snapshot (Restore lanzado 18:48:16, PVC
`Bound` 18:53:56, verificado por SQL 18:55). Evidencia en
[`evidencia-restauracion-datos.md`](evidencia-restauracion-datos.md).

RPO real: el respaldo es de 03:57:20 UTC del 24 sep. El `Schedule`
`sealed-secrets-key-backup` corrió a las 04:00:16 UTC con el cluster aún
vivo, así que el `destroy` empezó después de esa hora y antes de las 04:47
UTC (inicio del primer `apply`). Por tanto **RPO real < 50 min**, y no se
perdió ningún dato porque no hubo escrituras entre el respaldo y el
`destroy`. Lo que no se recuperó: el estado de NATS (su PVC no se restauró;
no guarda datos de negocio) y cualquier escritura posterior al respaldo. El
respaldo terminó `PartiallyFailed` por el hook de consistencia previo
(`Hooks Failed: 1`); el snapshot en sí fue válido (Postgres se recupera por
WAL).

## 5. Puntos únicos de fallo detectados

Cinco fallos reales de esta prueba (los tres primeros costaron la mayor parte
del RTO):

- **Bootstrap incompleto.** Terraform instalaba ArgoCD, Velero y Sealed
  Secrets, pero no Kyverno ni Argo Rollouts, que `sa-platform` necesita. Sin
  sus CRDs el sync falló y ArgoCD no reintenta la misma revisión.
- **Script de la llave sin dependencias declaradas.** `restore-sealed-secrets-key.sh`
  usa el CLI `velero` y oculta errores (`2>/dev/null`); en esta máquina no
  existía, así que dijo "no hay respaldos", se generó una llave nueva y los
  respaldos diarios siguientes guardaron la llave nueva. Los `SealedSecret` del
  repo (cifrados con la original) quedaron indescifrables hasta restaurar a
  mano el respaldo del 23 sep.
- **Kubeconfig desactualizado.** Cada cluster nuevo trae IP y certificado
  distintos; `bootstrap_app_of_apps` falló por timeout y luego por x509 hasta
  ejecutar `gcloud container clusters get-credentials`.
- **Finalizers de Velero.** En el `destroy`, los objetos `Restore` sin controlador
  dejaron el namespace `velero` en `Terminating`; hubo que limpiarlos a mano.
- **Restaurar un PVC con el StatefulSet vivo.** Postgres re-provisiona un PVC
  vacío que compite con Velero; además el `selfHeal` del app-of-apps deshace
  la pausa del auto-sync, y un PV huérfano en `Terminating` bloquea el
  restore hasta 10 min. Solo funciona con el StatefulSet en 0 y ambas
  Applications en pausa.
- El bucket de estado y el de respaldos están en el mismo proyecto de GCP que
  el cluster: perder el proyecto completo no tiene recuperación (se separó el
  stack, no la cuenta).

## 6. Brecha y plan

RPO: cumplido (< 50 min medido con respaldo manual; el diseño con respaldo
diario sigue siendo 24 h). RTO: **no cumplido** (≈ 86 min contra 30 min); sin
las tres intervenciones manuales el tramo automático fue de ≈ 33 min, muy
cerca del objetivo. Plan para cerrar la brecha:

1. Instalar Kyverno y Argo Rollouts desde Terraform (`helm_release`, antes de
   la Application raíz), de modo que los CRDs existan al primer sync.
2. Reescribir el script de la llave con `kubectl` (crear el `Restore`),
   esperar a que Velero sincronice el bucket y fallar con mensaje claro en vez
   de continuar con una llave nueva.
3. Añadir `gcloud container clusters get-credentials` como paso previo al
   bootstrap, y limpiar finalizers de Velero antes del `destroy`.
4. Documentar en el runbook el orden de la restauración de datos (pausar
   root y app, StatefulSet en 0, borrar PVC, restaurar, subir).

Con esto el RTO esperado es ≈ 35-40 min; si tras repetirlo no baja de 30 min,
el objetivo declarado se revisaría a 40 min en lugar de darlo por cumplido.
