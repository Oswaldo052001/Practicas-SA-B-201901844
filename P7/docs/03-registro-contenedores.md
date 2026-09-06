# Registro de contenedores - Practica 7

## Que se eligio y por que

**GitHub Container Registry (GHCR)**, `ghcr.io/<usuario>/sa-p7/<servicio>`.

Razones:

1. El auxiliar lo sugirio explicitamente en la clase de esta semana ("le
   sugiero este [GHCR] porque asi se quedan en el entorno de GitHub").
2. El pipeline corre en GitHub Actions: autenticarse contra GHCR usa el
   `secrets.GITHUB_TOKEN` que GitHub ya inyecta automaticamente en cada
   corrida, sin crear ni guardar ninguna credencial adicional (a
   diferencia de Docker Hub, que hubiera requerido generar un access token
   aparte y guardarlo como secreto).
3. A diferencia de Docker Hub (que solo permite 1 repositorio privado
   gratis), GHCR no cobra por cantidad de paquetes privados en cuentas
   personales.

## Diferencia importante con la Practica 6

En la Practica 6 el enunciado exigia explicitamente que las imagenes en
Artifact Registry **no** fueran publicas ("no pueden ser publicas"). El
enunciado de esta Practica 7, en la seccion de entregables, dice en cambio
que las imagenes deben quedar "publicadas correctamente en un **registry
publico** (DockerHub/GHCR)".

Se interpreto esa frase como "usar un servicio de registro publico/alojado
(DockerHub o GHCR), en contraste con levantar un registry privado propio",
no necesariamente como "las imagenes deben ser visibles para cualquiera".
Con esa lectura, y para simplificar el despliegue (GKE puede hacer `pull`
de un paquete GHCR publico sin necesitar un `imagePullSecret`), esta
practica publica las 7 imagenes como **publicas**.

**Si tu auxiliar esperaba que tambien aqui las imagenes fueran privadas
(como en P6), hay que pedirle que aclare esa frase del enunciado.** El
cambio para volverlas privadas es sencillo (ver abajo) y no afecta el resto
del pipeline.

## Como dejarlas privadas si hiciera falta

1. En GitHub: **Settings > Developer settings > Personal access tokens >
   Tokens (classic)** crea un token con el scope `read:packages` y
   guardalo como secreto del repo, por ejemplo `GHCR_PULL_TOKEN`.
2. En el job `deploy` del workflow, antes del `helm upgrade`, agregar:
   ```yaml
   - name: Crear/actualizar imagePullSecret para GHCR
     run: |
       kubectl create secret docker-registry ghcr-pull \
         --docker-server=ghcr.io \
         --docker-username=${{ github.actor }} \
         --docker-password=${{ secrets.GHCR_PULL_TOKEN }} \
         -n ${{ env.NAMESPACE }} \
         --dry-run=client -o yaml | kubectl apply -f -
   ```
3. Agregar `imagePullSecrets: [{name: ghcr-pull}]` a los `values` de cada
   subchart (o a un `global.imagePullSecrets` si se agrega soporte en
   `templates/deployment.yaml` de cada subchart, que hoy no lo tienen) y
   pasarlo con `--set` en el mismo `helm upgrade`.
4. En GitHub, cambiar la visibilidad de cada uno de los 7 paquetes a
   **Private** (`https://github.com/users/<usuario>/packages` >
   paquete > Package settings > Change visibility).

## Imagenes publicadas

| Servicio | Imagen |
|---|---|
| api-gateway | `ghcr.io/<usuario>/sa-p7/api-gateway:<tag>` |
| auth-service | `ghcr.io/<usuario>/sa-p7/auth-service:<tag>` |
| reserva-service | `ghcr.io/<usuario>/sa-p7/reserva-service:<tag>` |
| pago-service | `ghcr.io/<usuario>/sa-p7/pago-service:<tag>` |
| notificacion-service | `ghcr.io/<usuario>/sa-p7/notificacion-service:<tag>` |
| cronjob-registro | `ghcr.io/<usuario>/sa-p7/cronjob-registro:<tag>` |
| cronjob-resumen | `ghcr.io/<usuario>/sa-p7/cronjob-resumen:<tag>` |

`<tag>` es el nombre del tag de git que disparo el despliegue (por ejemplo
`p7-v1.0.0`); ademas se publica siempre `latest` por conveniencia, pero el
despliegue a GKE usa el tag exacto, nunca `latest`.

Las 7 se construyen a partir de los mismos `Dockerfile` multi-stage de la
Practica 5 (`P5/docker/<servicio>/Dockerfile`), sin ningun cambio.
