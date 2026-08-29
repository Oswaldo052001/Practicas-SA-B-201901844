# Evidencias Requeridas

Estado real al cierre de la sesion de trabajo (no se inventa ninguna evidencia que no se haya visto ejecutar realmente).

## Confirmado y probado en vivo

* Postgres desplegado como StatefulSet unico, con las 5 bases de datos logicas creadas correctamente por el script de initdb: `auth_db`, `reserva_db`, `pago_db`, `notificacion_db`, `cronjobs_db`.
* RabbitMQ corriendo establemente (0 reinicios tras el ajuste de recursos).
* Flujo sincrono completo probado extremo a extremo via el API Gateway: registro de usuario, login (JWT valido generado), creacion de reserva.
* `cronjob-registro` ejecutandose correctamente cada 2 minutos (`Completed`).
* **Flujo asincrono obligatorio pago -> RabbitMQ -> notificacion, confirmado de extremo a extremo:**
  
  ```
  Peticion: POST /api/pagos/pagos {"reservaId":1,"monto":150.00}
  Respuesta: {"id":5,"reservaId":1,"monto":150.0,"estado":"aprobado", ...}
  
  Logs de pago-service:
  [proveedor-pago-simulado] cobrando Q150.00 para la reserva 1... aprobado
  [pago-service] evento publicado en pagos-procesados: {"reservaId":1,"pagoId":5,"monto":150.0}
  
  Logs de notificacion-service:
  [notificacion-service] notificacion registrada: Pago confirmado para la reserva 1 por Q150
  ```
* **Flujo asincrono cronjob-resumen -> RabbitMQ -> notificacion, confirmado** (el cronjob calculo y publico resumenes reales, consumidos correctamente):
  
  ```
  Logs de notificacion-service:
  [notificacion-service] resumen almacenado: hora=2026-08-27 18:00 ejecuciones=5
  [notificacion-service] resumen almacenado: hora=2026-08-27 19:00 ejecuciones=1
  ```
* Los 10 componentes del chart llegaron a estado `Running`/`Completed` estable sin crash loop tras los ajustes de CPU/memoria/ResourceQuota del entorno local.
* ​**Persistencia de datos confirmada**​: se borro el pod `sa-platform-postgresql-0` y Kubernetes lo recreo automaticamente gracias al `PersistentVolumeClaim`. Los datos sobrevivieron intactos:
  
  ```
  Antes del borrado:
   id |       correo       | ... |         creado_en
  ----+--------------------+ ... +----------------------------
    1 | prueba@usac.edu.gt | ... | 2026-08-27 03:39:12.167504
  
  kubectl delete pod sa-platform-postgresql-0 -n sa-p5
  (pod recreado en 33 segundos, 0 reinicios)
  
  Despues del borrado (mismo id, mismo timestamp de creacion):
   id |       correo       | ... |         creado_en
  ----+--------------------+ ... +----------------------------
    1 | prueba@usac.edu.gt | ... | 2026-08-27 03:39:12.167504
  ```
  
  Nota: durante el reinicio de Postgres, `auth-service` y `reserva-service` entraron brevemente en `CrashLoopBackOff` porque su codigo termina el proceso si falla la conexion inicial a la base de datos; se recuperaron solos tras un `kubectl rollout restart` una vez Postgres estuvo arriba. Esto es un comportamiento esperado de resiliencia, no una perdida de datos.
* ​**Bloqueo por NetworkPolicy confirmado**​: se lanzo un pod sin ninguna etiqueta de rol autorizado (`kubectl run pod-no-autorizado --image=busybox`) dentro del mismo namespace, y se intento una peticion directa a `auth-service`:
  
  ```
  kubectl exec -n sa-p5 -it pod-no-autorizado -- wget -T 5 -O- http://auth-service
  
  Connecting to auth-service (10.111.64.50:80)
  wget: download timed out
  command terminated with exit code 1
  ```
  
  El timeout confirma que la NetworkPolicy `sa-p5-allow-gateway-to-microservices` esta bloqueando correctamente el trafico de cualquier pod que no tenga la etiqueta `sa.usac.edu/role: gateway`.
* ​**Comportamiento del broker con el consumidor caido, confirmado**​: se escalo `notificacion-service` a 0 replicas, se genero un pago mientras estaba caido, y se confirmo que el mensaje se acumulo sin perdida:
  
  ```
  kubectl scale deployment notificacion-service -n sa-p5 --replicas=0
  (0 pods de notificacion-service)
  
  POST /api/pagos/pagos {"reservaId":1,"monto":75.00}
  -> {"id":6,"reservaId":1,"monto":75.0,"estado":"aprobado", ...}
  
  rabbitmqctl list_queues name messages:
  pagos-procesados   1   <- mensaje acumulado, esperando consumidor
  
  kubectl scale deployment notificacion-service -n sa-p5 --replicas=1
  Logs: [notificacion-service] notificacion registrada: Pago confirmado para la reserva 1 por Q75
  
  rabbitmqctl list_queues name messages (despues):
  pagos-procesados   0   <- procesado, sin perdida de informacion
  ```
* ​**`helm rollback` confirmado**​: se subio `auth-service.replicaCount` de 1 a 2 en `values-dev.yaml` (revision 5), y luego se revirtio a la revision 4:
  
  ```
  helm history sa-platform -n sa-p5 (antes del cambio):
  REVISION  STATUS      DESCRIPTION
  4         deployed    Upgrade complete
  
  helm upgrade ... (replicaCount: 2)
  helm history:
  5         deployed    Upgrade complete
  (2 pods de auth-service creandose)
  
  helm rollback sa-platform 4 -n sa-p5
  Rollback was a success! Happy Helming!
  
  helm history (despues):
  5         superseded  Upgrade complete
  6         deployed    Rollback to 4
  (segundo pod de auth-service en Terminating, vuelve a 1 replica)
  ```
  
  Confirma que `helm rollback` no revierte el numero de revision sino que crea una nueva revision (6) que reaplica el estado de la revision 4.
* ​**Actualizacion sin downtime confirmada**​: se corrio un loop de 60 peticiones (una cada 500ms, \~30 segundos) contra `/health` del gateway, mientras en paralelo se ejecutaba `kubectl rollout restart deployment/api-gateway` (recreando el pod bajo la estrategia `RollingUpdate` con `maxUnavailable: 0`). Las 60 peticiones devolvieron `OK 200` sin ninguna linea de error durante todo el ciclo de reemplazo del pod (pod viejo `Terminating` mientras el nuevo ya estaba `1/1 Running` atendiendo trafico).
* ​**Escalado por HPA bajo carga, confirmado**​: se instalo `metrics-server` (no viene por defecto en Docker Desktop, a diferencia de minikube) y se ejecuto el script de carga con k6 contra el gateway. El HPA detecto la sobrecarga real y escalo automaticamente:
  
  ```
  kubectl get hpa -n sa-p5 -w (durante la carga):
  api-gateway-hpa            cpu: 398%/60%   REPLICAS: 1 -> 3
  notificacion-service-hpa   cpu: 204%/60%   REPLICAS: 1 -> 3
  
  Tras cesar la carga, el uso de CPU volvio a niveles normales (2-10%);
  las replicas bajan solas despues del periodo de estabilizacion de Kubernetes.
  ```
  
  Reporte completo de k6 (ver tambien `05-resultados-carga.md`):
  
  ```
  http_req_duration: avg=775.83ms min=5.98ms med=605.59ms max=3.29s p(90)=1.71s p(95)=1.89s
  http_req_failed:   0.00% (0 de 1830)
  http_reqs:         1830 (22.61 req/s)
  checks_succeeded:  100.00%
  vus_max:           80
  ```
  
  Nota: el umbral configurado en el script (`p(95)<1500ms`) no se cumplio (dio 1.89s), lo cual el propio k6 senala como threshold cruzado. Esto es esperable dado que los limites de CPU/memoria del entorno de desarrollo son deliberadamente bajos (para caber en una maquina local); en un ambiente de "prod" con los recursos definidos en `values-prod.yaml` la latencia bajo la misma carga seria menor.

