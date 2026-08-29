# Evidencias Requeridas

Estado real al cierre de la sesion de trabajo (no se inventa ninguna evidencia
que no se haya visto ejecutar realmente).

## Confirmado y probado en vivo

- Postgres desplegado como StatefulSet unico, con las 5 bases de datos
  logicas creadas correctamente por el script de initdb: `auth_db`,
  `reserva_db`, `pago_db`, `notificacion_db`, `cronjobs_db`.
- RabbitMQ corriendo establemente (0 reinicios tras el ajuste de recursos).
- Flujo sincrono completo probado extremo a extremo via el API Gateway:
  registro de usuario, login (JWT valido generado), creacion de reserva.
- `cronjob-registro` ejecutandose correctamente cada 2 minutos (`Completed`).
- Los 8 componentes del chart llegaron a estado `Running` estable sin
  crash loop tras los ajustes de CPU/memoria del entorno local.

## Pendiente de confirmar (el codigo esta listo, falta la prueba en vivo)

Estos requisitos tienen su implementacion completa en el chart y en el
codigo, pero la sesion de pruebas se interrumpio antes de poder capturar la
evidencia. Quedan como siguiente paso para el estudiante:

### 1. helm history con rollback

Comando a correr:
```
helm history sa-platform -n sa-p5
helm rollback sa-platform <revision_anterior> -n sa-p5
helm history sa-platform -n sa-p5
```
Nota: durante la sesion se hicieron multiples `helm upgrade` (llegando a la
revision 3), pero no se ejecuto un `helm rollback` explicito para capturar
como evidencia.

### 2. Flujo asincrono pago -> RabbitMQ -> notificacion

El codigo fue migrado completamente de Kafka a RabbitMQ (productor en
pago-service con Spring AMQP, consumidor en notificacion-service con
amqplib, ack manual solo tras procesar exitosamente). Las imagenes ya fueron
reconstruidas con el codigo correcto. Falta repetir esta prueba:
```
Invoke-RestMethod -Uri "http://localhost:30080/api/pagos/pagos" -Method Post -ContentType "application/json" -Body '{"reservaId":1,"monto":150.00}'
kubectl logs -l app.kubernetes.io/name=notificacion-service -n sa-p5 --tail=30
```
Y verificar en la tabla `notificaciones` de `notificacion_db` que el
registro se guardo.

### 3. Persistencia tras el borrado del pod de base de datos

```
kubectl exec -it sa-platform-postgresql-0 -n sa-p5 -- env PGPASSWORD='<password>' psql -U sa_admin -d auth_db -c "SELECT * FROM usuarios;"
kubectl delete pod sa-platform-postgresql-0 -n sa-p5
# esperar a que se recree
kubectl exec -it sa-platform-postgresql-0 -n sa-p5 -- env PGPASSWORD='<password>' psql -U sa_admin -d auth_db -c "SELECT * FROM usuarios;"
```

### 4. Bloqueo por NetworkPolicy

```
kubectl run pod-no-autorizado -n sa-p5 --image=busybox --restart=Never -- sleep 3600
kubectl exec -n sa-p5 -it pod-no-autorizado -- wget -T 5 -O- http://auth-service
kubectl delete pod pod-no-autorizado -n sa-p5
```

### 5. Escalado por HPA bajo carga

```
kubectl get hpa -n sa-p5 -w
k6 run -e GATEWAY_URL=http://localhost:30080 scripts/carga-k6.js
```

### 6. Actualizacion sin downtime

Correr un loop de peticiones continuas al `/health` del gateway mientras se
hace un `helm upgrade`, y confirmar que ninguna peticion falla.

### 7. Comportamiento del broker con el consumidor caido

```
kubectl scale deployment notificacion-service -n sa-p5 --replicas=0
# generar pagos mientras esta caido
kubectl scale deployment notificacion-service -n sa-p5 --replicas=1
kubectl logs -l app.kubernetes.io/name=notificacion-service -n sa-p5 --tail=50
```

