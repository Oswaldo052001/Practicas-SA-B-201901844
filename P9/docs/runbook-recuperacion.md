# Runbook de recuperación (criterio 1.1, "Runbook de recuperación")

Procedimiento pensado para que lo ejecute **una persona que no conoce este
sistema y no tiene acceso al autor** — cada paso trae el comando exacto y
cómo verificar que salió bien antes de seguir al siguiente. Si un paso
falla, el runbook indica dónde detenerse y qué revisar; no asume que quien
lo ejecuta va a "intuir" el arreglo.

## 0. Antes de empezar

Herramientas instaladas en la máquina desde donde se ejecuta: `terraform`
(>=1.5), `gcloud` (autenticado contra el proyecto GCP, con permisos de
Editor o superior), `kubectl`, `helm`, `velero` (CLI). Verificar con:

```bash
terraform -version && gcloud config get-value project && kubectl version --client && helm version && velero version --client-only
```

El bucket de estado remoto (`gs://sa-201901844-tfstate`) y el stack
"durable" (`P9/terraform-durable`) deben existir de antemano — ver la
sección "Requisito previo" más abajo. Si es la primerísima vez que se
monta todo el sistema (no una reconstrucción tras un desastre), aplicar
primero ese stack.

## 1. Requisito previo: stack "durable" (una sola vez, nunca se repite)

```bash
cd P9/terraform-durable
terraform init
terraform apply
```

Verificación: `terraform output velero_bucket_name` debe imprimir el
nombre del bucket. Si este paso ya se corrió antes (el bucket ya existe),
NO hay que repetirlo — de hecho no debe repetirse durante una
recuperación real, porque este stack es justamente el que sobrevive fuera
del alcance de la destrucción (ver comentario en
`P9/terraform-durable/backend.tf`).

## 2. Bootstrap / reconstrucción del entorno (el paso que se cronometra)

```bash
cd P9/terraform
terraform init            # o "terraform init -migrate-state" la PRIMERA vez
                           # que se migra desde el estado local de P8
terraform apply
```

Un único comando (`terraform apply`) hace todo: crea el cluster GKE, el
namespace, las cuotas/RBAC, instala ArgoCD, instala Velero (apuntando al
bucket del paso 1), restaura la llave de Sealed Secrets si hay un respaldo
previo, instala el controlador de Sealed Secrets, y aplica la Application
raíz de ArgoCD. Responder "yes" cuando lo pida.

**Marca de tiempo A** (inicio): anotar la hora exacta antes de correr
`terraform apply`.

Verificación de que Terraform terminó bien: el comando debe salir con
código 0 y mostrar `Apply complete!`. Si el paso `null_resource.
bootstrap_app_of_apps` falla, revisar que el kubeconfig local apunte al
cluster nuevo (`gcloud container clusters get-credentials sa-p8-cluster
--zone us-central1-c`) y reintentar con `terraform apply` de nuevo (es
seguro repetirlo, todos los recursos son idempotentes).

## 3. Verificar que ArgoCD terminó de sincronizar

```bash
kubectl -n argocd get applications
```

Las tres Applications (`sa-platform-root`, `sa-platform`,
`velero-resources`) deben mostrar `Synced` y `Healthy`. Si alguna queda en
`Progressing` por más de ~5 minutos, revisar con:

```bash
kubectl -n argocd get application sa-platform -o yaml | grep -A 20 status:
```

**Marca de tiempo B** (fin): anotar la hora exacta en el momento en que
las tres Applications quedan `Synced`/`Healthy`. **RTO real = B − A.**

## 4. Verificar que los datos son reales (no un volumen vacío)

La contraseña de postgres ya está disponible como variable de entorno
DENTRO del propio pod (la inyecta el SealedSecret descifrado) - por eso
estos comandos usan `sh -c` para que la sustitución de `$POSTGRES_PASSWORD`
ocurra DENTRO del pod, no en la terminal de quien ejecuta el runbook. Así
el mismo comando funciona igual en bash, PowerShell o cmd, sin depender
de una variable de entorno local que nadie más que el autor original
tendría configurada.

```bash
kubectl -n sa-p8 exec -it sa-platform-postgresql-0 -- sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres -c "\l"'
kubectl -n sa-p8 exec -it sa-platform-postgresql-0 -- sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres -d <nombre_bd> -c "SELECT count(*) FROM <alguna_tabla_conocida>;"'
```

El conteo debe coincidir con lo que había antes del desastre (comparar
contra el número anotado en el informe de la prueba de DR, campo
"Pérdida medida").

## 5. Verificar que los secretos siguen siendo descifrables

En bash/Git Bash/WSL:

```bash
kubectl -n sa-p8 get secret sa-platform-postgresql -o jsonpath='{.data.db-password}' | base64 -d
```

En PowerShell (no tiene `base64` por defecto, se decodifica así):

```powershell
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((kubectl -n sa-p8 get secret sa-platform-postgresql -o jsonpath="{.data.db-password}")))
```

Si el comando devuelve la contraseña en texto plano (no un error de
`SealedSecret` ni un Secret vacío), la llave de Sealed Secrets se restauró
correctamente y el controlador pudo descifrar el `SealedSecret` del repo
GitOps sin volver a sellarlo.

## 6. Verificar el punto público de entrada

```bash
kubectl -n sa-p8 get svc api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
curl http://<IP-anterior>:3000/health
```

## 7. Prueba de pérdida de nodo (opcional, no forma parte de la reconstrucción)

```bash
# En una terminal aparte, generar trafico continuo:
while true; do curl -s -o /dev/null -w "%{http_code} " http://<IP>:3000/health; sleep 1; done

# En otra terminal, identificar el nodo de una de las replicas de api-gateway:
kubectl -n sa-p8 get pods -l app.kubernetes.io/name=api-gateway -o wide

# Drenar ese nodo:
kubectl drain <nombre-nodo> --ignore-daemonsets --delete-emptydir-data --timeout=120s
```

Verificación: la terminal con el `curl` en bucle no debe mostrar códigos
distintos de `200` durante el drenaje (o, como mucho, un puñado de
timeouts breves mientras el tráfico se reencamina al Service). Al
terminar la verificación, descordonar el nodo:

```bash
kubectl uncordon <nombre-nodo>
```

## 8. Prueba de restauración de datos (pérdida de datos, no del cluster)

```bash
# 1. Anotar el conteo actual (ver paso 4).
# 2. Borrar datos a propósito (ejemplo, ajustar tabla real):
kubectl -n sa-p8 exec -it sa-platform-postgresql-0 -- \
  env PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres -d <nombre_bd> -c "TRUNCATE TABLE <tabla>;"

# 3. Marca de tiempo C (inicio de la restauracion).
# 4. Listar y elegir el respaldo mas reciente completado:
velero backup get

# 5. Restaurar:
velero restore create --from-backup <nombre-del-backup> --wait

# 6. Marca de tiempo D (fin: el "velero restore get <nombre>" muestra fase Completed).
# RPO real = timestamp de creacion del backup restaurado (no D-C) - ver
# informe de la prueba de DR, campo "Perdida medida".

# 7. Verificar de nuevo el conteo (paso 4) contra el valor anotado en el punto 1.
```

## 9. Si algo sale mal y hay que empezar de cero

`terraform destroy` dentro de `P9/terraform` (nunca dentro de
`P9/terraform-durable` — eso destruiría los respaldos). Confirmar con
`terraform state list` que solo aparecen recursos del cluster/plataforma,
no del bucket de respaldos, antes de confirmar el destroy.
