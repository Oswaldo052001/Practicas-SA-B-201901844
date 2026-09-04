# Practica 6 - Despliegue de la plataforma en un cluster de Kubernetes en la nube

Universidad San Carlos de Guatemala, Facultad de Ingenieria, Software Avanzado,
Seccion B, Segundo Semestre 2026. Estudiante: Oswaldo Antonio Choc, carne
201901844.

## Que es esto

Lleva la plataforma CineTix (construida en la Practica 4, empaquetada con
Helm en la Practica 5) a un cluster de **Google Kubernetes Engine (GKE)**
administrado, publicandola con una direccion IP publica verificable desde
internet.

No se reescribe la aplicacion: se reutiliza integramente el codigo, los
Dockerfiles y el chart de Helm de `P5/`. Esta carpeta solo agrega lo que
cambia por el hecho de estar en la nube:

- Un overlay de valores de Helm (`charts/values-gke.yaml`) con la
  StorageClass de GKE y el Service del gateway como `LoadBalancer`.
- Los scripts que automatizan todo el procedimiento (`scripts/`).
- La documentacion exigida por el enunciado (`docs/`).
- Las capturas de evidencia (`evidencias/`).

## Correccion importante heredada de la Practica 5

Durante la lectura de esta practica quedo claro que la comunicacion entre
`api-gateway` y los microservicios **debe ser asincrona** (requisito
obligatorio de la rubrica de P6), y que el broker recomendado originalmente
por el auxiliar para la mensajeria del curso es **NATS**, no RabbitMQ. En la
Practica 5 se habia usado RabbitMQ (como alternativa a Kafka, por consumo de
memoria) y el gateway hablaba HTTP sincrono directo con cada microservicio.

Antes de tocar nada de la nube, se corrigio esto en el codigo de `P5/src`:

- Se reemplazo RabbitMQ por **NATS JetStream** en todo el flujo de eventos
  (pago confirmado, resumen de cronjobs).
- El `api-gateway` ya no abre conexiones HTTP directas a los pods de los
  microservicios: ahora publica cada peticion en NATS (patron
  request-reply) y cada microservicio la recibe y la reenvia, por loopback,
  a su propio servidor HTTP interno (que no cambio: las rutas y
  controladores siguen siendo los mismos).

El detalle completo de esta correccion, con el porque, esta en
`P5/docs/01-arquitectura.md` (seccion "Correccion Practica 6") y en
`docs/01-arquitectura-nube.md` de esta carpeta.

## Estructura

```
P6/
  charts/
    values-gke.yaml          Overlay de Helm para GKE (StorageClass, LoadBalancer)
    values-secrets-gke.yaml  NO SE VERSIONA - credenciales reales (copiar de P5/charts/sa-platform/values.example.yaml)
  scripts/
    desplegar-gke.ps1        Procedimiento completo, paso a paso, en PowerShell
    verificar.ps1            Prueba el sistema desde internet (curl a la IP publica)
    eliminar-recursos.ps1    Elimina TODO al finalizar (cluster, release, registry)
  docs/
    00-rubrica-checklist.md  Mapa de cada punto de la rubrica -> donde esta cubierto
    01-arquitectura-nube.md  Diagrama, diferencias local vs nube, decisiones
    02-comandos-reproducibles.md
    03-registro-contenedores.md
    04-evidencias.md         Capturas requeridas (plantilla)
    05-costos.md
    06-eliminacion-recursos.md
    07-preguntas-teoricas.md Respuestas a las 5 preguntas obligatorias del enunciado
  evidencias/                Capturas de pantalla (.png)
```

## Inicio rapido

Ver `docs/02-comandos-reproducibles.md` para el detalle completo. Resumen:

```powershell
cd P6
# 1) copiar y llenar las credenciales reales
Copy-Item ..\P5\charts\sa-platform\values.example.yaml charts\values-secrets-gke.yaml
notepad charts\values-secrets-gke.yaml

# 2) editar las variables del inicio de scripts\desplegar-gke.ps1
#    (PROJECT_ID, etc.) y correrlo por bloques (PASO 1..9)
.\scripts\desplegar-gke.ps1

# 3) verificar desde internet y tomar capturas
.\scripts\verificar.ps1

# 4) SOLO despues de tener todas las capturas:
.\scripts\eliminar-recursos.ps1
```
