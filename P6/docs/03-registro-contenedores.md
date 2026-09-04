# Registro de contenedores - Practica 6

## Que se eligio y por que

**Google Artifact Registry**, en modo `docker`, region `us-central1`,
repositorio `sa-p6`.

Razones:

1. El cluster ya esta en GKE (mismo proveedor): GCP administra el permiso
   de `pull` entre Artifact Registry y los nodos del cluster de forma
   automatica, sin tener que crear ni montar un `imagePullSecret` a mano.
2. En clase el auxiliar senalo que usar el registro nativo del proveedor de
   nube evita problemas de politicas que a veces bloquean el pull desde
   otros registries (y que corregir esa politica es "una configuracion
   menos" que hacer bien vs. hacer de mas).
3. Es gratis dentro de la capa gratuita/creditos de estudiante para el
   volumen de estas 7 imagenes.
4. A diferencia de Docker Hub, no exige pagar para tener mas de una imagen
   **privada**, y el enunciado exige explicitamente que las imagenes no
   sean publicas.

## Imagenes publicadas

| Servicio | Imagen |
|---|---|
| api-gateway | `us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/api-gateway:p6` |
| auth-service | `us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/auth-service:p6` |
| reserva-service | `us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/reserva-service:p6` |
| pago-service | `us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/pago-service:p6` |
| notificacion-service | `us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/notificacion-service:p6` |
| cronjob-registro | `us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/cronjob-registro:p6` |
| cronjob-resumen | `us-central1-docker.pkg.dev/<PROJECT_ID>/sa-p6/cronjob-resumen:p6` |

Las 7 se construyen a partir de los mismos `Dockerfile` multi-stage de la
Practica 5 (`P5/docker/<servicio>/Dockerfile`), sin ningun cambio: la
correccion de mensajeria (RabbitMQ -> NATS) solo toco dependencias de
`package.json`/`pom.xml` y codigo fuente, no la forma en que se construye la
imagen.

## Privacidad

Por defecto, un repositorio de Artifact Registry es privado: solo puede
hacer `pull` una identidad autenticada con permiso (la propia cuenta del
estudiante y, automaticamente, los nodos del cluster GKE del mismo
proyecto). No se cambio ninguna configuracion para hacerlo publico.
Verificar en la consola: **Artifact Registry > sa-p6 > Permisos**, sin la
entrada `allUsers`.
