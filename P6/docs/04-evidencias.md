# Evidencias de funcionamiento - Practica 6

Plantilla. Cada seccion indica que capturar y el comando que la genera.
Guardar las imagenes en `evidencias/` con el nombre sugerido, e incrustarlas
aqui abajo con `![descripcion](../evidencias/archivo.png)`.

## 1. Cluster creado (2 nodos)

```powershell
kubectl get nodes -o wide
```

- [ ] `evidencias/01-nodos.png` - salida del comando (2 nodos en `Ready`).
- [ ] `evidencias/02-consola-gke.png` - consola de GCP, Kubernetes Engine > Clusters, mostrando `sa-p6-cluster`.

## 2. Imagenes publicadas en el registro

- [ ] `evidencias/03-artifact-registry.png` - consola de GCP, Artifact Registry > sa-p6, con las 7 imagenes listadas.

## 3. Plataforma desplegada

```powershell
kubectl get pods -n sa-p6 -o wide
kubectl get pvc -n sa-p6
```

- [ ] `evidencias/04-pods.png` - todos los pods en `Running`/`Completed` (incluye postgresql y nats).
- [ ] `evidencias/05-pvc.png` - los PVC en `Bound`, con la StorageClass `standard-rwo`.

## 4. Exposicion publica del sistema

```powershell
kubectl get svc -n sa-p6
```

- [ ] `evidencias/06-service-loadbalancer.png` - `api-gateway` con `EXTERNAL-IP` publica (no `<pending>`).
- [ ] `evidencias/07-navegador-health.png` - `http://<IP-PUBLICA>:3000/health` abierto en el navegador, respondiendo `{"status":"ok",...}`.

## 5. Peticiones reales desde internet (`scripts/verificar.ps1`)

- [ ] `evidencias/08-verificar-consola.png` - salida completa de `verificar.ps1` (registro, login, crear reserva via GraphQL, crear pago, notificaciones generadas por el evento asincrono).

## 6. Comunicacion asincrona (requisito obligatorio)

```powershell
kubectl logs deployment/notificacion-service -n sa-p6 | Select-String "notificacion registrada"
kubectl logs deployment/pago-service -n sa-p6 | Select-String "evento publicado"
```

- [ ] `evidencias/09-logs-nats.png` - logs mostrando la publicacion del evento en `pago-service` y su consumo en `notificacion-service` via NATS JetStream.

## 7. Secrets (sin credenciales expuestas en el repo)

```powershell
kubectl get secrets -n sa-p6
```

- [ ] `evidencias/10-secrets.png` - lista de Secrets (`sa-platform-postgresql`, `sa-platform-nats`, etc.), sin mostrar su contenido.

## 8. NetworkPolicies

```powershell
kubectl get networkpolicy -n sa-p6
```

- [ ] `evidencias/11-networkpolicies.png` - las policies activas en el namespace.
