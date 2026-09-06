# Practica 7 - Integracion y Despliegue Continuo (CI/CD)

Universidad San Carlos de Guatemala, Facultad de Ingenieria, Software
Avanzado, Seccion B, Segundo Semestre 2026. Estudiante: Oswaldo Antonio
Choc, carne 201901844.

## Que es esto

Automatiza con **GitHub Actions** el ciclo completo de integracion y
despliegue continuo del sistema CineTix construido en practicas
anteriores: build, pruebas automatizadas, construccion de imagenes Docker,
publicacion en un registro de contenedores y despliegue automatico al
cluster de Kubernetes (GKE) que ya existe desde la Practica 6.

No se reescribe la aplicacion ni el chart de Helm: se reutiliza integramente
el codigo de `P5/src`, los Dockerfile de `P5/docker` y el chart de
`P5/charts/sa-platform` con el overlay de GKE de `P6/charts/values-gke.yaml`.
Lo unico que agrega esta carpeta es el pipeline que automatiza lo que en la
Practica 6 se hacia a mano con los scripts de PowerShell, mas la
documentacion que exige el enunciado.

## Que se agrego para que el pipeline tenga algo real que probar

El enunciado exige "Ejecucion de pruebas automaticas" como etapa
obligatoria del pipeline. Los microservicios de `P5/src` no tenian ninguna
prueba automatizada todavia (la Practica 5/6 no lo pedian), asi que en esta
practica se agregaron pruebas unitarias reales (no de relleno) a los 7
servicios:

| Servicio | Que se prueba | Framework |
|---|---|---|
| auth-service | registro/login del `AuthService` (mockeando el repositorio) | Jest + ts-jest |
| reserva-service | validaciones y flujo de `ReservaService` (mockeando el repositorio) | Jest + ts-jest |
| api-gateway | tabla de enrutamiento (se extrajo a `src/routing.ts` para poder probarla sin levantar Express) | Jest + ts-jest |
| notificacion-service | formateo de mensajes de notificacion (se extrajo a `src/eventos/formato.ts`) | Jest + ts-jest |
| cronjob-registro | conversion de fecha a GMT-6 (se extrajo a `fecha.js`) | Jest |
| cronjob-resumen | mapeo de filas de Postgres al evento de NATS (se extrajo a `mapear.js`) | Jest |
| pago-service | `PagoService` (mockeando repositorio, proveedor de pago y JetStream) y `ProveedorPagoSimulado` | JUnit 5 + Mockito |

En los 4 servicios donde la logica original estaba mezclada con
infraestructura (Express, NATS, Postgres) directamente dentro de una sola
funcion, se extrajo la parte pura y testeable a un modulo aparte
(`routing.ts`, `formato.ts`, `fecha.js`, `mapear.js`) sin cambiar el
comportamiento observable del servicio: es la tecnica de "shift left
testing" vista en la clase de esta practica, aplicada a codigo que no se
diseno pensando en pruebas desde el inicio.

Todas las pruebas de los 6 servicios en Node se corrieron localmente
(`npx jest`) y pasan. Las de `pago-service` (Java) no se pudieron correr en
este entorno de trabajo porque no tenia Maven instalado ni acceso a Maven
Central; **hay que correr `mvn test` una vez en tu maquina para confirmar
que compilan y pasan antes de la entrega** (ver
`docs/00-rubrica-checklist.md`).

## Estructura

```
P7/
  README.md                        Este archivo
  docs/
    00-rubrica-checklist.md         Mapa de cada punto de la rubrica -> donde esta cubierto, y pendientes
    01-diagrama-pipeline.md         Diagrama del pipeline (Mermaid) con las 4+ fases
    02-explicacion-flujo.md         Documentacion tecnica detallada del flujo CI/CD (para la entrega y para la sustentacion)
    03-registro-contenedores.md     Decision de registro (GHCR), visibilidad de las imagenes, como cambiarla a privado
    04-preguntas-teoricas.md        Preparacion de preguntas teoricas (el enunciado no trae una lista fija, se prepara con base en la clase)
    05-evidencias.md                Plantilla de capturas requeridas

.github/workflows/p7-cicd.yml       El pipeline (vive en la raiz del repo, no dentro de P7, porque GitHub Actions
                                     solo reconoce workflows en .github/workflows)
```

## Antes de correr el pipeline (una sola vez)

1. El release de Helm `sa-platform` debe existir en el cluster GKE
   `sa-p6-cluster` (namespace `sa-p6`). Si ya corriste
   `P6/scripts/eliminar-recursos.ps1` para no seguir pagando, repite los
   pasos 1-8 de `P6/scripts/desplegar-gke.ps1` para recrearlo (esto es lo
   que el auxiliar llamo en clase "pagar los 50 dolares temporales de GCP":
   el cluster tiene que estar vivo el dia que se califique, y se elimina
   despues).
2. Crea una cuenta de servicio de GCP con el rol `roles/container.developer`
   sobre el proyecto, descarga su llave JSON, y guardala como secreto del
   repositorio de GitHub: **Settings > Secrets and variables > Actions >
   New repository secret**, nombre `GCP_SA_KEY`.
3. (Opcional) Si tu `PROJECT_ID`, cluster, zona o namespace son distintos a
   los de la Practica 6, agrega las variables de repositorio
   `GCP_PROJECT_ID`, `GKE_CLUSTER`, `GKE_ZONE`, `GKE_NAMESPACE` en
   **Settings > Secrets and variables > Actions > Variables**. Si no las
   agregas, el workflow usa los mismos valores que P6.
4. La primera vez que el pipeline haga push de las 7 imagenes a GHCR,
   quedan privadas por defecto. Ve a tus paquetes en GitHub
   (`https://github.com/users/<tu-usuario>/packages`) y cambia la
   visibilidad de las 7 (`sa-p7/api-gateway`, etc.) a **Public**, para que
   GKE pueda hacer `pull` sin necesitar un `imagePullSecret` (ver
   `docs/03-registro-contenedores.md` para la justificacion y la
   alternativa si prefieres mantenerlas privadas).

## Como disparar el pipeline

```bash
# CI (build + test) en cualquier push o pull request:
git push origin mi-rama-feature

# CI + CD completo (build, test, build/push de imagenes, deploy a GKE):
git tag p7-v1.0.0
git push origin p7-v1.0.0
```

Las capturas de evidencia (ver `docs/05-evidencias.md`) se toman desde la
pestana **Actions** del repositorio despues de que el workflow termine en
verde.
