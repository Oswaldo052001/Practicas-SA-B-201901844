# Resultados de la Prueba de Carga

Ejecutado con `k6 run -e GATEWAY_URL=http://localhost:30080 scripts/carga-k6.js` contra el API Gateway (namespace `sa-p5`, cluster Docker Desktop local).

Perfil de carga: rampa de 1 a 30 VUs (20s), de 30 a 80 VUs (30s), baja de 80 a 30 VUs (20s), y de 30 a 0 (10s). Duracion total: 1 minuto 20 segundos. Se acorto de la duracion original propuesta (varios minutos) para agilizar la sesion de pruebas, manteniendo el mismo patron de concurrencia creciente que exige el enunciado.

## Resultados

| Metrica                               | Valor                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Peticiones por segundo (RPS)          | 22.61 req/s                                                            |
| Latencia promedio                     | 775.83 ms                                                              |
| Latencia p90                          | 1.71 s                                                                 |
| Latencia p95                          | 1.89 s                                                                 |
| Latencia maxima                       | 3.29 s                                                                 |
| Porcentaje de error                   | 0.00% (0 de 1830 peticiones)                                           |
| Checks exitosos                       | 100.00% (1830 de 1830)                                                 |
| VUs maximos alcanzados                | 80                                                                     |
| Replicas maximas alcanzadas (HPA)     | 3 (api-gateway y notificacion-service)                                 |
| CPU maxima observada durante la carga | api-gateway: 398% / notificacion-service: 204% (sobre el 60% objetivo) |

## Salida completa de k6

```
█ THRESHOLDS
    http_req_duration
    ✗ 'p(95)<1500' p(95)=1.89s
    http_req_failed
    ✓ 'rate<0.05' rate=0.00%

  █ TOTAL RESULTS
    checks_total.......: 1830    22.613837/s
    checks_succeeded...: 100.00% 1830 out of 1830
    checks_failed......: 0.00%   0 out of 1830
    ✓ status es 200

    HTTP
    http_req_duration..............: avg=775.83ms min=5.98ms med=605.59ms max=3.29s p(90)=1.71s p(95)=1.89s
      { expected_response:true }...: avg=775.83ms min=5.98ms med=605.59ms max=3.29s p(90)=1.71s p(95)=1.89s
    http_req_failed................: 0.00%  0 out of 1830
    http_reqs......................: 1830   22.613837/s

    EXECUTION
    iteration_duration.............: avg=1.77s    min=1s     med=1.6s     max=4.29s p(90)=2.72s p(95)=2.89s
    iterations.....................: 1830   22.613837/s
    vus............................: 1      min=1         max=80
    vus_max........................: 80     min=80        max=80

    NETWORK
    data_received..................: 878 kB 11 kB/s
    data_sent......................: 190 kB 2.4 kB/s
```

## Evidencia de escalado automatico (HPA)

```
kubectl get hpa -n sa-p5 -w

Antes de la carga:
api-gateway-hpa            cpu: 2%/60%     REPLICAS: 1
notificacion-service-hpa   cpu: 2%/60%     REPLICAS: 1

Durante la carga:
api-gateway-hpa            cpu: 398%/60%   REPLICAS: 1 -> 3
notificacion-service-hpa   cpu: 204%/60%   REPLICAS: 1 -> 3

Despues de cesar la carga:
api-gateway-hpa            cpu: 2%/60%     REPLICAS: 3
notificacion-service-hpa   cpu: 3%/60%     REPLICAS: 3
```

Las replicas se mantienen en 3 durante un periodo de estabilizacion antes de que el HPA las reduzca de vuelta a 1, comportamiento estandar de Kubernetes para evitar oscilaciones (flapping) por picos de carga momentaneos.

## Analisis

El threshold configurado en el script (`p(95)<1500ms`) no se cumplio (dio 1.89s). Esto se debe a que los limites de CPU/memoria configurados en `values-dev.yaml` son deliberadamente bajos para caber en un equipo de desarrollo local (Docker Desktop, 7.7 GB de RAM total compartidos entre Postgres, RabbitMQ, 5 microservicios y el propio Kubernetes). El objetivo de la prueba —confirmar que el HPA detecta la sobrecarga y escala automaticamente— se cumplio: el uso de CPU llego a superar varias veces el umbral configurado (60%), lo que disparo el escalado de 1 a 3 replicas tanto en `api-gateway` como en `notificacion-service`. En un ambiente con los recursos de `values-prod.yaml` (limites mas altos, ver tabla comparativa en ese archivo), la latencia bajo la misma carga seria significativamente menor.

Nota tecnica: Docker Desktop no trae `metrics-server` preinstalado (a diferencia de minikube, que lo ofrece como addon). Fue necesario instalarlo manualmente y ajustar sus argumentos (`--kubelet-insecure-tls` para aceptar los certificados autofirmados del kubelet de Docker Desktop, y `--secure-port=10250` para que coincida con el puerto declarado en el manifiesto) antes de que el HPA pudiera obtener metricas reales de CPU.

