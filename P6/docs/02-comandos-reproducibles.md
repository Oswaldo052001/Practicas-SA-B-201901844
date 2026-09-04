# Comandos reproducibles - Practica 6

Todo el procedimiento esta automatizado en `scripts/desplegar-gke.ps1`
(PowerShell, Windows). Este documento explica cada bloque para quien quiera
reproducirlo manualmente o entender que hace cada paso.

## Prerrequisitos

Instalar en la maquina donde se va a desplegar:

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- `kubectl`: `gcloud components install kubectl`
- [Helm 3](https://helm.sh/docs/intro/install/): `choco install kubernetes-helm` o el instalador oficial
- Docker Desktop (ya se usaba desde la Practica 4)

Verificar que todo responde:

```powershell
gcloud --version
kubectl version --client
helm version
docker --version
```

## Paso 1-2: autenticacion, proyecto y APIs

```powershell
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud auth application-default login
gcloud services enable container.googleapis.com artifactregistry.googleapis.com
```

## Paso 3-4: registro de contenedores e imagenes

```powershell
gcloud artifacts repositories create sa-p6 `
  --repository-format=docker --location=us-central1 `
  --description="Imagenes privadas Practica 6 - carne 201901844"

gcloud auth configure-docker us-central1-docker.pkg.dev

# build + push de cada servicio (repite por los 7 servicios)
docker build -t us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/api-gateway:p6 -f ..\P5\docker\api-gateway\Dockerfile ..\P5\src\api-gateway
docker push us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/api-gateway:p6
```

Ver `docs/03-registro-contenedores.md` para el detalle de por que se eligio
Artifact Registry y por que las imagenes deben quedar privadas.

## Paso 5: cluster GKE administrado

```powershell
gcloud container clusters create sa-p6-cluster `
  --zone us-central1-a --num-nodes 2 --machine-type e2-medium --disk-size 30

gcloud container clusters get-credentials sa-p6-cluster --zone us-central1-a

kubectl get nodes -o wide
```

Se usan **2 nodos** porque es el minimo que exige tanto el enunciado escrito
(seccion 3.2, punto 1) como el criterio "Satisfactorio" de la rubrica
("El cluster administrado esta creado con al menos 2 nodos"); en clase el
auxiliar comento de forma informal que con 1 nodo alcanzaba para no gastar
creditos, pero esa fue una sugerencia verbal para ahorrar durante las
pruebas, no un cambio a la rubrica escrita, que es la que se sigue aqui.
`e2-medium` (en vez de `e2-small`) porque `pago-service` es una aplicacion
Java/Spring Boot y necesita algo mas de CPU disponible al arrancar.

## Paso 6: dependencias de Helm

```powershell
cd ..\P5\charts\sa-platform
helm dependency update
cd ..\..\..\P6
```

Esto descarga el subchart de PostgreSQL (Bitnami) declarado en `Chart.yaml`;
el subchart de `nats` es local (vendorizado en `charts/nats/`, igual que
los subcharts de cada microservicio), asi que no se descarga de ningun
repositorio externo.

## Paso 7: credenciales (Secrets)

```powershell
Copy-Item ..\P5\charts\sa-platform\values.example.yaml charts\values-secrets-gke.yaml
notepad charts\values-secrets-gke.yaml
```

Reemplazar los `REEMPLAZAR-*` con valores reales generados, por ejemplo:

```powershell
# generar una clave aleatoria de 32 bytes en base64 (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Este archivo **no se versiona** (ya esta en `.gitignore` junto con
`values-secrets.yaml` de P5).

## Paso 8: instalar con Helm

```powershell
helm install sa-platform ..\P5\charts\sa-platform `
  -f ..\P5\charts\sa-platform\values.yaml `
  -f ..\P5\charts\sa-platform\values-prod.yaml `
  -f .\charts\values-gke.yaml `
  -f .\charts\values-secrets-gke.yaml `
  --set global.namespace=sa-p6 `
  --set api-gateway.image.repository=us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/api-gateway --set api-gateway.image.tag=p6 `
  # ... un --set por cada uno de los otros 6 servicios (ver el script completo)
  -n sa-p6 --create-namespace
```

## Paso 9: verificar

```powershell
kubectl get pods -n sa-p6 -o wide
kubectl get svc -n sa-p6
kubectl get pvc -n sa-p6
```

Cuando `kubectl get svc api-gateway -n sa-p6` muestre una IP en
`EXTERNAL-IP` (no `<pending>`), correr `scripts/verificar.ps1` para probar
el sistema completo desde esa IP publica y capturar la evidencia.

## Reinstalar / actualizar tras un cambio

```powershell
helm upgrade sa-platform ..\P5\charts\sa-platform -f ... -n sa-p6
```

## Desinstalar

Ver `docs/06-eliminacion-recursos.md` y `scripts/eliminar-recursos.ps1`.
