# Guion Maestro para la Calificación — Práctica 6

Carné 201901844 — Software Avanzado, sección B. Este documento sigue el orden exacto de la hoja de calificación oficial. Para cada criterio: qué evalúa, el comando a correr, y qué evidencia/salida demuestra que se cumple.

**Antes de empezar:** el auxiliar comentó que va a calificar viendo que esté subido al clúster y que los pods estén corriendo — eso es el criterio 1.3 de abajo. Aun así, dejamos todo el resto listo por si pide ver algo más.

---

## 0. Preparación (antes de que te toque el turno)

1. Abrí Docker Desktop y esperá a que el ícono de la ballena quede fijo (no imprescindible para lo que sigue, pero por si hace falta reconstruir algo de último momento).
2. Abrí PowerShell (normal, no hace falta administrador) y parate en la carpeta del proyecto:
   ```powershell
   cd "C:\Users\Oswaldo Choc\Documents\Oswaldo\USAC\2026\Segundo Semestre\SA\Laboratorio\Practicas\Practicas-SA-B-201901844\P6"
   ```
3. Confirmá que `kubectl` sigue apuntando al clúster correcto:
   ```powershell
   kubectl config current-context
   kubectl get nodes
   ```
   Si no reconoce el clúster (por ejemplo si cambiaste de compu), corré:
   ```powershell
   gcloud container clusters get-credentials sa-p6-cluster --zone us-central1-a
   ```

---

## 1. Habilidades (40 puntos)

### 1.1 Creación y configuración del clúster (10 pts)

**Qué evalúa:** que el clúster administrado exista con al menos 2 nodos y que `kubectl` esté conectado correctamente al contexto remoto (la nube, no tu máquina).

```powershell
kubectl get nodes -o wide
```

**Qué muestra esto:** la lista de nodos del clúster de GKE, todos en estado `Ready`. Confirma que `kubectl` habla con el clúster real en Google Cloud.

**Evidencia guardada:** `evidencias/01-nodos.png`
**Consola de GCP (alternativa):** https://console.cloud.google.com/kubernetes/clusters/details/us-central1-a/sa-p6-cluster/overview?project=cinetix-p6

---

### 1.2 Publicación de imágenes (10 pts)

**Qué evalúa:** que las 7 imágenes de los microservicios estén en un registro privado accesible, y que el clúster las descargue sin errores (sin `ImagePullBackOff`).

**Cómo se valida:** en la consola de GCP, o revisando que ningún pod tenga el estado `ImagePullBackOff` en el comando de la sección 1.3.

**Consola de GCP:** https://console.cloud.google.com/artifacts/docker/cinetix-p6/us-central1/sa-p6

**Qué muestra esto:** las 7 imágenes (`api-gateway`, `auth-service`, `reserva-service`, `pago-service`, `notificacion-service`, `cronjob-registro`, `cronjob-resumen`) en un repositorio de tipo Docker, privado (no público).

**Evidencia guardada:** `evidencias/03-artifact-registry.png`

---

### 1.3 Despliegue de la plataforma (10 pts) — esto es lo que el auxiliar dijo que va a revisar

**Qué evalúa:** que todos los componentes de la Práctica 5 (los 7 microservicios + NATS + Postgres) estén corriendo dentro del clúster de la nube.

```powershell
kubectl get pods -n sa-p6 -o wide
```

**Qué muestra esto:** la lista completa de pods. Todos deben decir `Running` (los que dicen `Completed` son los CronJobs, que corren y terminan — eso es normal y correcto, no es un error).

**Tomar captura ahora mismo** → reemplaza `evidencias/04-pods.png`.

**Consola de GCP (alternativa):** https://console.cloud.google.com/kubernetes/workload/overview?project=cinetix-p6

---

### 1.4 Exposición pública del sistema (10 pts)

**Qué evalúa:** que el sistema responda desde internet mediante una dirección IP o dominio público.

```powershell
kubectl get svc -n sa-p6
```

**Qué muestra esto:** el `Service` de `api-gateway` de tipo `LoadBalancer` con una `EXTERNAL-IP` real (no `<pending>`).

**Evidencia guardada:** `evidencias/06-service-loadbalancer.png`

Para probar que responde de verdad, abrí en el navegador (reemplazá la IP si cambió):
```
http://34.132.176.9:3000/
```
Cualquier respuesta del servidor (aunque sea un error de "ruta no encontrada") confirma que el sistema es alcanzable desde internet — un timeout o "no se puede acceder al sitio" sería lo único que fallaría este criterio.

**Evidencia guardada:** `evidencias/07-navegador-respuesta.png`

---

## 2. Conocimiento (60 puntos)

### 2.1 Adaptación a la nube (15 pts)

**Qué evalúa:** almacenamiento con la StorageClass del proveedor (no configuraciones locales), secrets gestionados fuera del repositorio, y red (NetworkPolicies) correctamente configurada.

```powershell
kubectl get pvc -n sa-p6
kubectl get networkpolicy -n sa-p6
kubectl get secrets -n sa-p6
```

**Qué muestra esto:**
- Los `PersistentVolumeClaim` en estado `Bound` usando la StorageClass `standard-rwo` (la de Google, no una local).
- Las `NetworkPolicy` activas en el namespace (`default-deny-ingress` + reglas específicas de quién puede hablar con quién).
- Los `Secret` existen (contraseñas de Postgres, NATS, JWT) pero su contenido nunca se muestra ni se sube al repositorio — están en `charts/values-secrets-gke.yaml`, que está en `.gitignore`.

**Evidencia guardada:** `evidencias/05-pvc-networkpolicies.png`
**Tomar captura adicional de los secrets** → `evidencias/10-secrets.png` (solo la lista de nombres, nunca el contenido).

---

### 2.2 Evidencias de funcionamiento (15 pts)

**Qué evalúa:** capturas de la consola del proveedor, de los pods en ejecución, y de peticiones exitosas realizadas desde internet.

```powershell
.\scripts\verificar.ps1
```

**Qué muestra esto:** el script prueba el sistema real de punta a punta desde afuera — registra un usuario, hace login, crea una reserva vía GraphQL, genera un pago, y confirma que la notificación se generó automáticamente por el evento asíncrono. Es la prueba más completa de que todo funciona junto, no solo que los pods están "arriba".

**Tomar captura de toda la salida** → `evidencias/08-verificar-consola.png`.

Después, para demostrar específicamente la comunicación asíncrona (requisito obligatorio del enunciado):
```powershell
kubectl logs deployment/pago-service -n sa-p6 --tail=50
kubectl logs deployment/notificacion-service -n sa-p6 --tail=50
```
**Qué muestra esto:** en los logs de `pago-service` aparece la publicación del evento de pago hacia NATS; en los logs de `notificacion-service` aparece que ese mismo evento fue consumido y procesado — confirma que `api-gateway` y los microservicios se comunican de forma asíncrona (vía NATS JetStream), no con HTTP síncrono directo.

**Tomar captura** → `evidencias/09-logs-nats.png`.

Ya reunidas, todas las capturas de la consola de GCP (sección 1.1 y 1.2 de este documento) más las de esta sección cubren el criterio completo.

---

### 2.3 Preguntas teóricas (20 pts)

**Qué evalúa:** respuestas completas, analíticas y con tus propias palabras (penaliza respuestas copiadas o genéricas).

**Pendiente de tu parte:** revisar y reescribir `docs/07-preguntas-teoricas.md` con tus propias palabras antes de entregar. Ya tiene un borrador completo, pero el punteo depende de que se note que las respuestas son tuyas.

---

## 3. Si el auxiliar pide verlo "directamente desde Google Cloud"

Sin depender de tu terminal, usando solo la consola web:

- **Imágenes:** https://console.cloud.google.com/artifacts/docker/cinetix-p6/us-central1/sa-p6
- **Clúster:** https://console.cloud.google.com/kubernetes/clusters/details/us-central1-a/sa-p6-cluster/overview?project=cinetix-p6
- **Cargas de trabajo (pods):** https://console.cloud.google.com/kubernetes/workload/overview?project=cinetix-p6

**Truco útil — Cloud Shell:** arriba a la derecha en la consola de GCP hay un ícono `>_`. Al abrirlo, ya viene con `gcloud` y `kubectl` autenticados con tu cuenta — podés correr `kubectl get pods -n sa-p6` ahí mismo, desde el navegador, sin usar tu PowerShell. Es la forma más directa de demostrar que funciona "desde adentro de GCP" si te lo piden así en el momento.

---

## 4. Después de que te califiquen

No borres nada todavía si hay más grupos por calificar ese mismo día y el auxiliar podría querer volver a revisar. Cuando confirme que ya calificó la práctica, corré:

```powershell
.\scripts\eliminar-recursos.ps1
```

para no seguir generando costo en la cuenta de GCP. Confirmá también que la alerta de presupuesto (USD 5) siga activa mientras tanto, por si el clúster queda arriba más tiempo del esperado.
