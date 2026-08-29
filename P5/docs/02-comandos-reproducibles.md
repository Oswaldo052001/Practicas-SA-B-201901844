# Comandos Reproducibles - Practica 5

Sistema operativo de referencia: Windows con PowerShell, Docker Desktop con Kubernetes habilitado (no minikube ni kind). Estos son los pasos reales que se siguieron y confirmaron funcionando en un despliegue completo.

## 0. Prerrequisitos

* Docker Desktop instalado y corriendo.
* Habilitar Kubernetes: Docker Desktop -> Settings -> Kubernetes -> Enable Kubernetes -> Apply & Restart. Confirmar con `kubectl get nodes` (debe aparecer el nodo `docker-desktop` en estado `Ready`).
* Instalar Helm si no esta disponible: `winget install Helm.Helm` (cerrar y reabrir la terminal despues). Confirmar con `helm version`.
* kubectl normalmente ya viene con Docker Desktop; confirmar con `kubectl version --client`.

## 1. Construir las imagenes de Docker

Ejecutar desde la raiz de la carpeta `P5`. Es importante usar `--no-cache` la primera vez que se construye cada imagen despues de cualquier cambio de codigo fuente: Docker puede reutilizar una capa cacheada de una copia de codigo anterior y dar la falsa impresion de que se reconstruyo, cuando en realidad el binario sigue siendo el viejo.

```powershell
docker build --no-cache -t sa-p5/auth-service:dev -f docker/auth-service/Dockerfile .
docker build --no-cache -t sa-p5/reserva-service:dev -f docker/reserva-service/Dockerfile .
docker build --no-cache -t sa-p5/pago-service:dev -f docker/pago-service/Dockerfile .
docker build --no-cache -t sa-p5/notificacion-service:dev -f docker/notificacion-service/Dockerfile .
docker build --no-cache -t sa-p5/api-gateway:dev -f docker/api-gateway/Dockerfile .
docker build --no-cache -t sa-p5/cronjob-registro:dev -f docker/cronjob-registro/Dockerfile .
docker build --no-cache -t sa-p5/cronjob-resumen:dev -f docker/cronjob-resumen/Dockerfile .
```

Nota: el build de `pago-service` (Java/Maven) tarda varios minutos la primera vez porque descarga todas las dependencias de Spring Boot.

## 2. No es necesario cargar las imagenes a un cluster aparte

A diferencia de minikube o kind, Docker Desktop con Kubernetes habilitado comparte el mismo daemon de Docker entre el `docker build` y el cluster, asi que las imagenes construidas en el paso anterior ya son visibles directamente para los pods (`imagePullPolicy: IfNotPresent`).

## 3. Resolver dependencias del chart (Bitnami)

```powershell
cd charts/sa-platform
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm dependency update
```

Nota sobre el catalogo de Bitnami: desde agosto de 2025, Bitnami retiro su catalogo gratuito `docker.io/bitnami/*` y movio las imagenes a `docker.io/bitnamilegacy/*` (repositorio congelado, solo para migracion). El `values.yaml` de este chart ya tiene declarado el override necesario (`image.repository: bitnamilegacy/...` y `global.security.allowInsecureImages: true`) tanto para PostgreSQL como para RabbitMQ, asi que no hace falta ningun ajuste manual adicional en este paso.

## 4. Preparar credenciales (no versionadas)

```powershell
Copy-Item values.example.yaml values-secrets.yaml
```

Editar `values-secrets.yaml` con credenciales reales. Debe tener esta forma:

```yaml
postgresql:
  auth:
    username: sa_admin
    password: "<password-real>"
    database: sa_platform_db
    postgresPassword: "<password-real>"

rabbitmq:
  auth:
    password: "<password-real>"

secrets:
  jwtSecret: "<clave-hex-64-caracteres>"
  aesSecretKey: "<clave-hex-64-caracteres>"
```

## 5. Validar el chart antes de instalar

```powershell
helm lint . -f values.yaml -f values-dev.yaml -f values-secrets.yaml
```

Debe devolver `0 chart(s) failed`.

## 6. Instalacion real (ambiente dev)

```powershell
helm install sa-platform . -f values.yaml -f values-dev.yaml -f values-secrets.yaml --namespace sa-p5 --create-namespace
```

## 7. Verificar el despliegue

```powershell
kubectl get pods -n sa-p5
```

Es normal ver varios reinicios (`RESTARTS`) en los primeros minutos mientras PostgreSQL y RabbitMQ terminan de inicializar y los microservicios reintentan conectarse; deben estabilizarse en `1/1 Running` sin seguir reiniciando despues de 3-5 minutos.

```powershell
kubectl get svc -n sa-p5
kubectl get statefulset -n sa-p5
kubectl get cronjob -n sa-p5
kubectl get networkpolicy -n sa-p5
kubectl exec -it sa-platform-postgresql-0 -n sa-p5 -- env PGPASSWORD='<password>' psql -U sa_admin -d postgres -c "\l"
```

El ultimo comando confirma que las 5 bases de datos logicas existen: `auth_db`, `reserva_db`, `pago_db`, `notificacion_db`, `cronjobs_db`.

## 8. Acceder al gateway

Con Docker Desktop, el Service tipo NodePort del gateway es accesible directamente en `localhost` en el puerto configurado (30080):

```powershell
Invoke-RestMethod -Uri "http://localhost:30080/health"
```

## 9. Probar el flujo de negocio completo

```powershell
Invoke-RestMethod -Uri "http://localhost:30080/api/auth/registro" -Method Post -ContentType "application/json" -Body '{"correo":"prueba@usac.edu.gt","password":"Test1234"}'

Invoke-RestMethod -Uri "http://localhost:30080/api/auth/login" -Method Post -ContentType "application/json" -Body '{"correo":"prueba@usac.edu.gt","password":"Test1234"}'

Invoke-RestMethod -Uri "http://localhost:30080/api/reservas" -Method Post -ContentType "application/json" -Body '{"usuarioId":1,"funcionId":10,"asientos":2}'

Invoke-RestMethod -Uri "http://localhost:30080/api/pagos/pagos" -Method Post -ContentType "application/json" -Body '{"reservaId":1,"monto":150.00}'

kubectl logs -l app.kubernetes.io/name=notificacion-service -n sa-p5 --tail=20
```

## 10. Evidencia: helm history, upgrade y rollback

```powershell
helm upgrade sa-platform . -f values.yaml -f values-dev.yaml -f values-secrets.yaml -n sa-p5
helm history sa-platform -n sa-p5
helm rollback sa-platform <numero_revision_anterior> -n sa-p5
helm history sa-platform -n sa-p5
```

## 11. Evidencia: persistencia de datos

```powershell
kubectl exec -it sa-platform-postgresql-0 -n sa-p5 -- env PGPASSWORD='<password>' psql -U sa_admin -d auth_db -c "SELECT * FROM usuarios;"
kubectl delete pod sa-platform-postgresql-0 -n sa-p5
kubectl get pods -n sa-p5 -w
kubectl exec -it sa-platform-postgresql-0 -n sa-p5 -- env PGPASSWORD='<password>' psql -U sa_admin -d auth_db -c "SELECT * FROM usuarios;"
```

## 12. Evidencia: bloqueo por NetworkPolicy

```powershell
kubectl run pod-no-autorizado -n sa-p5 --image=busybox --restart=Never -- sleep 3600
kubectl exec -n sa-p5 -it pod-no-autorizado -- wget -T 5 -O- http://auth-service
kubectl delete pod pod-no-autorizado -n sa-p5
```

## 13. Evidencia: comportamiento del broker con el consumidor caido

```powershell
kubectl scale deployment notificacion-service -n sa-p5 --replicas=0
Invoke-RestMethod -Uri "http://localhost:30080/api/pagos/pagos" -Method Post -ContentType "application/json" -Body '{"reservaId":1,"monto":75.00}'
kubectl scale deployment notificacion-service -n sa-p5 --replicas=1
kubectl logs -l app.kubernetes.io/name=notificacion-service -n sa-p5 --tail=30
```

## 14. Prueba de carga y evidencia de HPA

```powershell
kubectl get hpa -n sa-p5 -w
k6 run -e GATEWAY_URL=http://localhost:30080 scripts/carga-k6.js
```

---

## Problemas encontrados durante el despliegue real y su solucion

Esta seccion documenta, con honestidad, los problemas reales que aparecieron al desplegar en un entorno local con recursos limitados, y como se resolvieron, para que quien reproduzca estos pasos no se sorprenda si aparecen los mismos sintomas.

**1. Imagenes de Bitnami no encontradas (`ErrImagePull`, `not found`):** causado por el retiro del catalogo gratuito de Bitnami en agosto de 2025. Solucion: apuntar `image.repository` a `bitnamilegacy/...` y activar `global.security.allowInsecureImages: true` (ya incluido en `values.yaml`).

**2. Kafka en `OOMKilled` (exit code 137) constante:** la JVM de Kafka, incluso con una sola replica, consumia mas memoria de la disponible en un equipo local. Solucion: se migro el broker de Kafka a RabbitMQ (alternativa valida segun el enunciado), mucho mas liviano por no requerir JVM.

**3. `pago-service` en `CrashLoopBackOff` por `startupProbe` fallido:** con limites de CPU muy bajos (300-400m), el arranque de Spring Boot se volvia tan lento por throttling que el `startupProbe` lo mataba antes de terminar. Solucion: subir los limites de CPU de `pago-service` en `values-dev.yaml` a al menos `1500m` y el `startupProbe.failureThreshold` a `60`.

**4. `504 Gateway Timeout` al llamar rutas via el gateway:** las variables `*_SERVICE_URL` inyectadas al `api-gateway` no incluian el puerto de cada microservicio (usaban el puerto 80 por defecto, donde no habia nada escuchando). Solucion: agregar explicitamente el puerto de cada servicio (`:3001`, `:3003`, `:3004`, `:3005`) en el `deployment.yaml` del gateway.

**5. `Cannot POST /api/reservas` pese a tener `pathFilter` configurado con glob/string:** la libreria `http-proxy-middleware` v3 no evaluaba de forma confiable los patrones de texto para rutas sin segmento adicional (`/api/reservas` exacto). Solucion: usar una funcion como `pathFilter` (`(pathname) => pathname.startsWith(...)`) en vez de strings/globs.

**6. `FailedCreate: exceeded quota` al hacer `kubectl rollout restart`:** el `RollingUpdate` con `maxUnavailable: 0` necesita crear un pod adicional temporal (maxSurge) antes de eliminar el viejo, lo que puede exceder el `ResourceQuota` del namespace si esta muy ajustado. Solucion: dejar margen en `resourceQuota.limitsCpu` (al menos 1.5x la suma de limites individuales) para permitir el surge temporal durante actualizaciones.

**7. Imagenes reconstruidas que seguian ejecutando el codigo viejo:** ocurrio en `api-gateway`, `pago-service`, `notificacion-service` y `cronjob-resumen`: tras editar el codigo fuente, `docker build` sin `--no-cache` reutilizaba una capa cacheada de la copia de codigo anterior. Solucion: usar siempre `--no-cache` al reconstruir una imagen despues de un cambio de codigo relevante, especialmente si el nombre de la etiqueta (`:dev`) no cambia entre builds.

