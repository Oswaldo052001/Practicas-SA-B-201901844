# Comandos Reproducibles - Practica 5

Sistema operativo de referencia: Windows con PowerShell. Ajustar rutas segun
corresponda si se ejecuta en otro sistema.

## 0. Prerrequisitos

- Docker Desktop corriendo.
- Un cluster local: minikube, kind o k3s (elegir uno).
- Helm 3 y kubectl instalados y en el PATH.
- metrics-server habilitado en el cluster (necesario para que el HPA
  funcione).

## 1. Levantar el cluster local (ejemplo con minikube)

```powershell
minikube start --cpus=4 --memory=6144 --driver=docker
minikube addons enable metrics-server
kubectl get nodes
```

## 2. Construir las imagenes de Docker

Ejecutar desde la raiz de la carpeta `P5`.

```powershell
docker build -t sa-p5/auth-service:dev -f docker/auth-service/Dockerfile .
docker build -t sa-p5/reserva-service:dev -f docker/reserva-service/Dockerfile .
docker build -t sa-p5/pago-service:dev -f docker/pago-service/Dockerfile .
docker build -t sa-p5/notificacion-service:dev -f docker/notificacion-service/Dockerfile .
docker build -t sa-p5/api-gateway:dev -f docker/api-gateway/Dockerfile .
docker build -t sa-p5/cronjob-registro:dev -f docker/cronjob-registro/Dockerfile .
docker build -t sa-p5/cronjob-resumen:dev -f docker/cronjob-resumen/Dockerfile .
```

## 3. Cargar las imagenes al cluster local

Con minikube, las imagenes construidas localmente no son visibles para el
cluster a menos que se carguen explicitamente:

```powershell
minikube image load sa-p5/auth-service:dev
minikube image load sa-p5/reserva-service:dev
minikube image load sa-p5/pago-service:dev
minikube image load sa-p5/notificacion-service:dev
minikube image load sa-p5/api-gateway:dev
minikube image load sa-p5/cronjob-registro:dev
minikube image load sa-p5/cronjob-resumen:dev
```

(Si se usa kind, el comando equivalente es `kind load docker-image <imagen>`).

## 4. Resolver dependencias del chart (Bitnami)

```powershell
cd charts/sa-platform
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm dependency update
```

## 5. Preparar credenciales (no versionadas)

```powershell
Copy-Item values.example.yaml values-secrets.yaml
# Editar values-secrets.yaml con credenciales reales antes de continuar.
```

## 6. Primera instalacion (ambiente dev)

```powershell
helm lint . -f values.yaml -f values-dev.yaml -f values-secrets.yaml

helm install sa-platform . `
  -f values.yaml -f values-dev.yaml -f values-secrets.yaml `
  --namespace sa-p5 --create-namespace
```

## 7. Verificar el despliegue

```powershell
kubectl get pods -n sa-p5 -w
kubectl get svc -n sa-p5
kubectl get statefulset -n sa-p5
kubectl get cronjob -n sa-p5
kubectl get networkpolicy -n sa-p5
```

Acceder al gateway (minikube):

```powershell
minikube service api-gateway -n sa-p5 --url
```

## 8. Evidencia: helm history, upgrade y rollback

```powershell
# Hacer un cambio menor en algun values (ej. cambiar replicaCount de un
# microservicio) y luego:
helm upgrade sa-platform . -f values.yaml -f values-dev.yaml -f values-secrets.yaml -n sa-p5

helm history sa-platform -n sa-p5

# Provocar un rollback a la revision anterior:
helm rollback sa-platform <numero_revision_anterior> -n sa-p5
helm history sa-platform -n sa-p5
```

## 9. Evidencia: persistencia de datos

```powershell
kubectl exec -n sa-p5 -it sa-platform-postgresql-0 -- psql -U sa_admin -d auth_db -c "SELECT * FROM usuarios;"
kubectl delete pod -n sa-p5 sa-platform-postgresql-0
kubectl get pods -n sa-p5 -w
# Esperar a que el pod se recree y volver a consultar la misma tabla:
kubectl exec -n sa-p5 -it sa-platform-postgresql-0 -- psql -U sa_admin -d auth_db -c "SELECT * FROM usuarios;"
```

## 10. Evidencia: bloqueo por NetworkPolicy

```powershell
kubectl run pod-no-autorizado -n sa-p5 --image=busybox --restart=Never -- sleep 3600
kubectl exec -n sa-p5 -it pod-no-autorizado -- wget -T 5 -O- http://auth-service
# Debe fallar por timeout, evidenciando el bloqueo.
kubectl delete pod pod-no-autorizado -n sa-p5
```

## 11. Evidencia: comportamiento del broker con el consumidor caido

```powershell
kubectl scale deployment notificacion-service -n sa-p5 --replicas=0
# Generar pagos mientras el consumidor esta caido (via Postman o curl al gateway):
curl -X POST http://<url-gateway>/api/pagos/pagos -H "Content-Type: application/json" -d "{\"reservaId\": 1, \"monto\": 50}"
kubectl scale deployment notificacion-service -n sa-p5 --replicas=2
kubectl logs -n sa-p5 -l app.kubernetes.io/name=notificacion-service --tail=50
# Los mensajes acumulados deben procesarse al restaurar el consumidor.
```

## 12. Prueba de carga y evidencia de HPA

```powershell
kubectl get hpa -n sa-p5 -w
kubectl get pods -n sa-p5 -w

k6 run -e GATEWAY_URL=http://<url-gateway> scripts/carga-k6.js
```

## 13. Instalacion en ambiente "prod"

```powershell
helm upgrade sa-platform . `
  -f values.yaml -f values-prod.yaml -f values-secrets.yaml `
  -n sa-p5
```
