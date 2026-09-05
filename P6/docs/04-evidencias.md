# Evidencias de funcionamiento - Practica 6

Estado actualizado 2026-09-05 (noche previa a calificacion). La mayoria de las
evidencias ya estan tomadas y guardadas en `evidencias/`. Las que faltan se
toman con el guion de `docs/08-guion-calificacion.md` (dura ~5 minutos, se
puede correr otra vez el dia de la calificacion sin problema).

## 1. Cluster creado (2+ nodos, kubectl conectado al contexto remoto)

```powershell
kubectl get nodes -o wide
```

- [x] `evidencias/01-nodos.png` - salida del comando (2 nodos en `Ready`,
      tomada cuando el cluster tenia 2 nodos; luego se escalo a 5 para tener
      margen de recursos, pero el requisito minimo de 2 ya quedo demostrado).
- [x] `evidencias/02-consola-gke.png` - consola de GCP, Kubernetes Engine >
      Clusters > `sa-p6-cluster`, estado `Running`.

## 2. Imagenes publicadas en el registro

- [x] `evidencias/03-artifact-registry.png` - consola de GCP, Artifact
      Registry > `sa-p6`, con las 7 imagenes listadas (api-gateway,
      auth-service, reserva-service, pago-service, notificacion-service,
      cronjob-registro, cronjob-resumen).

## 3. Plataforma desplegada

```powershell
kubectl get pods -n sa-p6 -o wide
kubectl get pvc -n sa-p6
```

- [ ] `evidencias/04-pods.png` - todos los pods en `Running`/`Completed`
      (incluye postgresql y nats). **Pendiente**: tomar de nuevo justo antes
      de la calificacion con el guion (paso 3).
- [x] `evidencias/05-pvc-networkpolicies.png` - los PVC en `Bound` con
      StorageClass `standard-rwo`, y las NetworkPolicies activas (cubre
      tambien la seccion 8 de este documento).

## 4. Exposicion publica del sistema

```powershell
kubectl get svc -n sa-p6
```

- [x] `evidencias/06-service-loadbalancer.png` - `api-gateway` con
      `EXTERNAL-IP` publica `34.132.176.9` (no `<pending>`).
- [x] `evidencias/07-navegador-respuesta.png` - `http://34.132.176.9:3000/`
      respondiendo desde el navegador (```Cannot GET /``` - confirma que el
      servidor Express esta vivo y accesible desde internet; no hay ruta
      `/health` publica en el api-gateway actual, la prueba de comunicacion
      real se hace con `scripts/verificar.ps1` en la seccion 5).

## 5. Peticiones reales desde internet (`scripts/verificar.ps1`)

- [ ] `evidencias/08-verificar-consola.png` - salida completa de
      `verificar.ps1` (registro, login, crear reserva via GraphQL, crear
      pago, notificaciones generadas por el evento asincrono). **Pendiente**,
      paso 5 del guion de calificacion.

## 6. Comunicacion asincrona (requisito obligatorio)

```powershell
kubectl logs deployment/notificacion-service -n sa-p6 --tail=50
kubectl logs deployment/pago-service -n sa-p6 --tail=50
```

- [ ] `evidencias/09-logs-nats.png` - logs mostrando la publicacion del
      evento en `pago-service` y su consumo en `notificacion-service` via
      NATS JetStream. **Pendiente**, paso 6 del guion (se toma justo despues
      de correr `verificar.ps1`, para que ya haya un pago real que generar
      evento).

## 7. Secrets (sin credenciales expuestas en el repo)

```powershell
kubectl get secrets -n sa-p6
```

- [ ] `evidencias/10-secrets.png` - lista de Secrets (`sa-platform-nats`,
      `sa-platform-postgresql`, etc.), sin mostrar su contenido. **Pendiente**,
      paso 7 del guion.

## 8. NetworkPolicies

Ver `evidencias/05-pvc-networkpolicies.png` (seccion 3) - ya incluye la
salida de `kubectl get networkpolicy -n sa-p6` con las policies activas
(`sa-p5-default-deny-ingress`, `sa-p5-allow-ingress-to-gateway`,
`sa-p5-allow-services-to-postgresql`, `sa-p5-allow-to-nats`).

## Nota sobre el nombre "sa-p5" en las NetworkPolicies

Los nombres de las policies (`sa-p5-*`) vienen del helper de Helm que no se
renombro al crear el overlay de P6; esto es cosmetico, laas policies aplican
correctamente sobre el namespace `sa-p6` real (confirmado en la captura). Si
el auxiliar pregunta, se explica asi: el chart es el mismo que P5, solo con
un overlay de valores para GKE, y el nombre interno del helper no se
actualizo pero no afecta la funcionalidad.
