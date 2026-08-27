# Tabla Comparativa de Tamano de Imagenes

Esta tabla debe llenarse ejecutando los comandos indicados despues de
construir las imagenes en tu maquina (ver `02-comandos-reproducibles.md`).

## Como medir el "antes"

Para tener una referencia de "antes", construir una version de una sola
etapa (sin multi-stage) de al menos un servicio, por ejemplo comentando
temporalmente la etapa de build en el Dockerfile y usando una imagen base
completa (`node:20` en vez de `node:20-alpine`, o `eclipse-temurin:17` en vez
de `eclipse-temurin:17-jre-alpine`), y comparar contra la version final
multi-stage optimizada.

```powershell
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

## Tabla a completar

| Microservicio | Imagen base antes | Tamano antes | Imagen base despues (multi-stage) | Tamano despues | Reduccion |
|---|---|---|---|---|---|
| auth-service | node:20 | ___ MB | node:20-alpine (runtime) | ___ MB | ___ % |
| reserva-service | node:20 | ___ MB | node:20-alpine (runtime) | ___ MB | ___ % |
| pago-service | eclipse-temurin:17 | ___ MB | eclipse-temurin:17-jre-alpine (runtime) | ___ MB | ___ % |
| notificacion-service | node:20 | ___ MB | node:20-alpine (runtime) | ___ MB | ___ % |
| api-gateway | node:20 | ___ MB | node:20-alpine (runtime) | ___ MB | ___ % |

Nota: los Dockerfiles ya entregados en `docker/*/Dockerfile` estan escritos
con multi-stage build y base minima (alpine / jre-alpine) desde el inicio.
Para obtener el numero de "antes" real, se recomienda hacer una copia
temporal de un Dockerfile, quitar la primera etapa (FROM ... AS build) y
usar directamente la imagen base completa como runtime, solo para efectos de
medicion comparativa.
