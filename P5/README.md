# Practica 5 - Orquestacion avanzada de microservicios en Kubernetes con Helm

Universidad San Carlos de Guatemala, Facultad de Ingenieria, Software
Avanzado, Seccion B, Segundo Semestre 2026. Estudiante: Oswaldo Antonio Choc,
carne 201901844.

## Que es esto

Empaquetado con Helm de la plataforma CineTix (construida en la Practica 4)
llevandola a un nivel de madurez operativa superior: instalable, actualizable
y reversible con un solo comando, con comunicacion asincrona via RabbitMQ,
persistencia durable con PostgreSQL, aislamiento de red con NetworkPolicies,
y controles de seguridad (RBAC, securityContext, HPA, PDB).

Namespace de trabajo: `sa-p5` (creado por el propio chart).

## Estructura de este entregable

```
P5/
  docker/       Dockerfiles multi-stage de cada microservicio y cronjob
  src/          Codigo fuente de los 5 microservicios y los 2 cronjobs
  charts/       Chart de Helm (sa-platform, chart padre + 7 subcharts)
  scripts/      Script de prueba de carga con k6
  docs/         Documentacion completa (ver indice abajo)
```

## Indice de documentacion

1. `docs/01-arquitectura.md` - Diagrama de arquitectura y decisiones de diseno
2. `docs/02-comandos-reproducibles.md` - Todos los comandos desde cero
3. `docs/03-comparativa-imagenes.md` - Plantilla de tamano de imagenes
4. `docs/04-evidencias.md` - Plantilla de evidencias requeridas
5. `docs/05-resultados-carga.md` - Plantilla de resultados de k6
6. `docs/06-preguntas-teoricas.md` - Respuestas a las preguntas teoricas

## Importante antes de entregar

Este paquete incluye todo el codigo fuente, el chart de Helm completo, y la
documentacion base ya escrita. Sin embargo, las secciones marcadas como
"plantilla" (`04-evidencias.md`, `05-resultados-carga.md`,
`03-comparativa-imagenes.md`) requieren que ejecutes los comandos en tu
propio cluster local (minikube/kind/k3s) y pegues la salida real: ninguna
evidencia fue inventada, porque este entorno de desarrollo no tiene acceso a
un cluster de Kubernetes real ni a Docker para construir y correr las
imagenes. Sigue `docs/02-comandos-reproducibles.md` paso a paso para generar
esa evidencia.

Tambien reescribe `docs/06-preguntas-teoricas.md` con tus propias palabras
antes de entregar.

## Inicio rapido

```powershell
cd charts/sa-platform
helm dependency update
Copy-Item values.example.yaml values-secrets.yaml
# editar values-secrets.yaml con credenciales reales
helm install sa-platform . -f values.yaml -f values-dev.yaml -f values-secrets.yaml -n sa-p5 --create-namespace
```

Ver `docs/02-comandos-reproducibles.md` para el proceso completo, incluyendo
build de imagenes, carga al cluster, y captura de evidencias.
