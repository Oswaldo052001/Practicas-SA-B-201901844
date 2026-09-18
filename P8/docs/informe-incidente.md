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

Confirmado en el cluster: el `AnalysisRun` `api-gateway-7c4976bdbc-3-1`
inicio a las `2026-09-18T23:48:12Z` y su Job de k6 termino a las
`2026-09-18T23:48:42Z` (30 segundos, la duracion configurada del script de
k6), con el mensaje: *"Metric 'k6-canary-loadtest' assessed Failed due to
failed (1) > failureLimit (0)"*.

## Como se contuvo

Al recibir el resultado `Failed` en el `AnalysisRun`, Argo Rollouts abortó
automaticamente el rollout a las `2026-09-18T23:48:42Z`
(`Aborted At: 2026-09-18T23:48:42Z`, `Reason: RolloutAborted`), con el
mensaje: *"Rollout aborted update to revision 3: Step-based analysis phase
error/failed: Metric 'k6-canary-loadtest' assessed Failed due to failed (1)
> failureLimit (0)"*. El evento `SwitchService` confirma que el selector
del Service `api-gateway-canary` volvio de la revision con el fallo
(`7c4976bdbc`) a la revision estable (`66c84f49d4`), y el ReplicaSet de la
revision con el fallo se escalo de 1 a 0 replicas. Todo esto ocurrio sin
ninguna intervencion manual: no hubo que hacer rollback manual de Helm ni
de ArgoCD; el mecanismo de reversion esta incorporado en la propia
estrategia `canary` del `Rollout`.

## Tiempo de recuperacion

Desde que el `AnalysisRun` inicio (`23:48:12Z`) hasta que el `Rollout`
quedo abortado y con el trafico devuelto a `stable` (`Aborted At
23:48:42Z`, `SwitchService` segundos despues) el tiempo total de
recuperacion fue de **aproximadamente 1 minuto**, sin intervencion
humana. Es consistente con lo esperado: el ciclo de analisis de k6 dura
30s mas el tiempo de scheduling del Job y el tiempo de reaccion del
controller de Argo Rollouts.

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
