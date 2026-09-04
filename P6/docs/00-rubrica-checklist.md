# Checklist contra la rubrica oficial (Practica 6)

Carne: 201901844. Basado en la seccion 8 ("Rubrica de Calificacion") del
documento oficial de la practica. Usar esto como ultima revision antes de
presentar al auxiliar.

## 8.1 Requisitos previos (deben cumplirse para poder calificar)

| Requisito | Como se cumple |
|---|---|
| Cumplir con entrega de P5 | P5 ya entregado y calificado por separado. |
| Cluster en la nube (no local) | GKE, `docs/02-comandos-reproducibles.md` PASO 5. |
| Acceso publico | Service `api-gateway` tipo LoadBalancer con IP publica, `docs/04-evidencias.md`. |
| Documentacion en Markdown | Toda esta carpeta `docs/` esta en Markdown. |
| **Comunicacion asincrona entre microservicios y api-gateway** | Corregido antes de empezar P6: el gateway habla con todos los microservicios via NATS request-reply (ver `01-arquitectura-nube.md` y `P5/docs/01-arquitectura.md`). **Sin esto no se puede calificar la practica**, por eso se resolvio primero. |

## 8.2 Habilidades (40 pts)

| # | Criterio | Puntos | Donde esta |
|---|---|---|---|
| 1.1 | Creacion y configuracion del cluster | 10 | `scripts/desplegar-gke.ps1` PASO 5 (2 nodos e2-medium) + evidencia `kubectl get nodes`. |
| 1.2 | Publicacion de imagenes en el registro | 10 | Artifact Registry (privado), PASO 4 del script + evidencia de las 7 imagenes listadas. |
| 1.3 | Despliegue de la plataforma en la nube | 10 | `helm install` con `values-gke.yaml`, PASO 8 + evidencia `kubectl get pods` (todos Running). |
| 1.4 | Exposicion publica del sistema | 10 | Service `api-gateway` LoadBalancer + evidencia de peticiones reales desde `scripts/verificar.ps1`. |

## 8.2 Conocimiento (60 pts)

| # | Criterio | Puntos | Donde esta |
|---|---|---|---|
| 2.1 | Adaptacion a la nube (almacenamiento, red, secretos) | 15 | StorageClass `standard-rwo` en `values-gke.yaml`; NetworkPolicies (`P5/charts/.../templates/networkpolicies/`); Secrets (`values-secrets-gke.yaml`, no versionado). |
| 2.2 | Evidencias de funcionamiento | 15 | `docs/04-evidencias.md`: capturas del cluster, pods y peticiones reales desde internet. |
| 2.3 | Preguntas teoricas | 20 | `docs/07-preguntas-teoricas.md`, respondidas con palabras propias. |
| 2.4 | Gestion de costos y limpieza | 10 | `docs/05-costos.md` + `docs/06-eliminacion-recursos.md` + `scripts/eliminar-recursos.ps1`. |

## Cosas que NO olvidar antes de presentar

- Las imagenes de Docker deben ser **privadas** (Artifact Registry lo es por
  defecto: revisar que no se haya cambiado a publico).
- Repositorio de GitHub con el nombre exacto `PRACTICAS-SA-201901844`.
- El cluster debe seguir **arriba** al momento de que el auxiliar califique
  (el fue explicito: "levanten el cluster cada vez que me vayan a
  presentar"). Correr `scripts/desplegar-gke.ps1` un rato antes de la
  revision, y `scripts/eliminar-recursos.ps1` apenas termine.
- Segun un comentario informal de un companero (Javier, no confirmado por
  el auxiliar en clase) esta practica se revisaria de forma breve porque esa
  semana se dedica tiempo a revisar el Proyecto 1 por grupos. **No usar eso
  como excusa para bajar el nivel de la entrega**: el requisito obligatorio
  de comunicacion asincrona y la rubrica escrita siguen aplicando tal cual.
