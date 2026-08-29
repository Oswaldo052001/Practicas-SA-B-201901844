# Tabla Comparativa de Tamano de Imagenes

Medido con `docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"` en el entorno real de desarrollo (Docker Desktop, Windows).

## Metodologia

Para cada stack tecnologico (Node.js y Java/Spring Boot) se construyo una version de referencia "antes" — una sola etapa, usando la imagen base completa del lenguaje (`node:20`, `maven:3.9-eclipse-temurin-17`) — y se comparo contra la version final "despues", que ya usa multi-stage build y una base minima (`node:20-alpine`, `eclipse-temurin:17-jre-alpine`) desde el diseno original del proyecto.

Los demas microservicios de cada stack (`reserva-service`, `notificacion-service`, `api-gateway` para Node; no aplica otro en Java) usan exactamente el mismo patron de Dockerfile multi-stage, por lo que el porcentaje de reduccion observado es representativo para todos ellos.

## Resultados medidos

| Microservicio | Stack                 | Antes (una etapa, base completa)             | Despues (multi-stage, base minima)           | Reduccion       |
| --------------- | ----------------------- | ---------------------------------------------- | ---------------------------------------------- | ----------------- |
| auth-service  | Node.js 20            | 1.7 GB (`node:20`)                       | 206 MB (`node:20-alpine`)                | **\~88%** |
| pago-service  | Java 17 / Spring Boot | 1.11 GB (`maven:3.9-eclipse-temurin-17`) | 353 MB (`eclipse-temurin:17-jre-alpine`) | **\~68%** |

## Tamano final de todas las imagenes de la plataforma (ya optimizadas)

| Imagen                         | Tamano |
| -------------------------------- | -------- |
| sa-p5/auth-service:dev         | 206 MB |
| sa-p5/reserva-service:dev      | 224 MB |
| sa-p5/pago-service:dev         | 353 MB |
| sa-p5/notificacion-service:dev | 201 MB |
| sa-p5/api-gateway:dev          | 203 MB |
| sa-p5/cronjob-registro:dev     | 194 MB |
| sa-p5/cronjob-resumen:dev      | 195 MB |

## Analisis

La reduccion es mayor en el stack de Node.js (\~88%) porque la imagen base completa `node:20` incluye herramientas de compilacion, documentacion y utilidades de desarrollo que no se necesitan en produccion (el proceso compilado de TypeScript a JavaScript no requiere el compilador en tiempo de ejecucion), mientras que la etapa final `node:20-alpine` solo trae el runtime de Node y las dependencias de produccion (`npm install --omit=dev`).

En el caso de `pago-service` (Java), la reduccion es menor en terminos porcentuales (\~68%) porque el JRE de Java, incluso en su variante minima (`eclipse-temurin:17-jre-alpine`), pesa mas que el runtime de Node.js; aun asi la diferencia es sustancial: se elimina todo el JDK completo y las herramientas de Maven (necesarias solo para compilar, no para ejecutar el `.jar` ya construido).

