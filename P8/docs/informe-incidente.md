# Informe de incidente (criterio 1.3)

Universidad San Carlos de Guatemala, Software Avanzado, Seccion B, carne
201901844. Fallo inducido deliberadamente para demostrar la deteccion y
reversion automatica del despliegue progresivo (Argo Rollouts + Analysis).

## Que fallo

Se modifico a proposito el endpoint `GET /ready-check` de `api-gateway`
(tag `p8-v1.0.6`) para que responda siempre `HTTP 500`
(`{"status":"error","reason":"induced-failure-p8"}`), simulando una
regresion funcional que pasa desapercibida para el liveness/readiness
probe estandar (`/health`, que se dejo intacto) pero que si degrada la
experiencia real de los usuarios del `api-gateway`.

## Como se detecto

El `AnalysisTemplate` `api-gateway-canary-check`, ejecutado automaticamente
por Argo Rollouts en cada paso de la estrategia canary (`setWeight: 25/50/75`),
corre un Job de Kubernetes con un script de k6
(`tests/k6/loadtest.js`) que envia trafico real contra el Service
`api-gateway-canary` (que Argo Rollouts enruta exclusivamente a los pods de
la nueva version) apuntando a `/ready-check`. Los umbrales definidos
(`http_req_duration p(95)<500ms`, `http_req_failed rate<5%`) fallan de
inmediato porque el endpoint responde 500 el 100% de las veces, lo que hace
que el proceso de k6 termine con codigo de salida distinto de cero -> el Job
termina en `Failed` -> el `AnalysisRun` reporta la metrica como `Failed`.

**TBD**: hora exacta de creacion del AnalysisRun y hora exacta en la que
paso a `Failed` (pendiente de confirmar contra
`kubectl describe analysisrun api-gateway-<hash>-3-1 -n sa-p8`).

## Como se contuvo

Al recibir un resultado `Failed` en el `AnalysisRun`, Argo Rollouts abortó
automaticamente el rollout: detuvo el avance de `setWeight` y devolvio el
100% del trafico del Service principal a la version `stable` (la version
sana, previa al fallo inducido), sin ninguna intervencion manual. No hubo
que hacer rollback manual de Helm ni de ArgoCD; el mecanismo de reversion
esta incorporado en la propia estrategia `canary` del `Rollout`.

**TBD**: confirmar con `kubectl get rollout api-gateway -n sa-p8` que el
`Status` volvio a un estado sano (`Healthy`/`Degraded` transitorio) y que
los pods de la version con el fallo fueron escalados a 0.

## Tiempo de recuperacion

**TBD**: calcular como la diferencia entre la hora en que Argo Rollouts creo
el primer `AnalysisRun` para la revision con el fallo (inicio de la
deteccion) y la hora en que el `Rollout` quedo con el 100% del trafico de
vuelta en `stable` (fin de la contencion). Al ser un mecanismo automatico
end-to-end, se espera del orden de minutos (un ciclo de analisis completo
de k6 dura ~20s mas el tiempo de creacion/scheduling del Job).

## Como prevenirlo

- Agregar una prueba automatizada de contrato para `/ready-check` en la
  suite de pruebas del pipeline (Practica 7) que hubiera detectado la
  regresion antes de llegar siquiera a construir la imagen, en vez de
  depender solo del analisis en tiempo de despliegue.
- Extender el `AnalysisTemplate` con una segunda metrica basada en logs o en
  una metrica de negocio real (no solo disponibilidad HTTP), para detectar
  fallos funcionales mas sutiles que no siempreproducen un status code de
  error.
- Pasar las otras dos politicas de Kyverno (`require-resource-limits`,
  `require-run-as-nonroot`) de `Audit` a `Enforce` una vez validado que no
  rompen los subcharts de terceros, para reducir superficie de fallos
  similares por configuracion insegura.
