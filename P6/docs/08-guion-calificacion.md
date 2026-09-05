# Guion para el dia de la calificacion (sabado)

Este es el orden exacto a seguir cuando el auxiliar pida ver la Practica 6.
Se puede correr completo en unos 5-8 minutos. Todo en PowerShell normal (no
hace falta administrador para nada de esto).

## 0. Preparacion (antes de que te toque, con calma)

1. Abrir Docker Desktop y esperar a que el icono de la ballena quede fijo
   (no es indispensable para lo que sigue, pero por si acaso hay que
   reconstruir o probar algo local de ultimo momento).
2. Abrir PowerShell y pararse en la carpeta del proyecto:
   ```powershell
   cd "C:\Users\Oswaldo Choc\Documents\Oswaldo\USAC\2026\Segundo Semestre\SA\Laboratorio\Practicas\Practicas-SA-B-201901844\P6"
   ```
3. Confirmar que `kubectl` sigue apuntando al cluster correcto:
   ```powershell
   kubectl config current-context
   kubectl get nodes
   ```
   Si por alguna razon no reconoce el cluster (por ejemplo si usaste otra
   compu), correr de nuevo:
   ```powershell
   gcloud container clusters get-credentials sa-p6-cluster --zone us-central1-a
   ```

## 1. Mostrar el cluster y los nodos (criterio 1.1)

```powershell
kubectl get nodes -o wide
```
Mostrar esto en pantalla si el auxiliar pide verlo en vivo.

## 2. Mostrar todos los pods corriendo (criterio 1.3)

```powershell
kubectl get pods -n sa-p6 -o wide
```
**Tomar captura ahora** -> guardar como `evidencias/04-pods.png` (reemplaza
la pendiente). Todos deben decir `Running` o `Completed` (los `Completed`
son los CronJobs, es normal).

## 3. Mostrar el servicio con IP publica (criterio 1.4)

```powershell
kubectl get svc -n sa-p6
```

## 4. Probar el sistema real desde internet (criterio 2.2 / requisito async)

```powershell
.\scripts\verificar.ps1
```
Este script hace: registro de usuario, login, crear una reserva via
GraphQL, crear un pago, y verifica que la notificacion se genere via el
evento asincrono de NATS. **Tomar captura de toda la salida** -> guardar
como `evidencias/08-verificar-consola.png`.

Si el script pide la IP publica y no la tiene fija, correr antes:
```powershell
kubectl get svc api-gateway -n sa-p6
```
y copiar la IP de la columna `EXTERNAL-IP`.

## 5. Mostrar los logs de la comunicacion asincrona (requisito obligatorio)

```powershell
kubectl logs deployment/pago-service -n sa-p6 --tail=50
kubectl logs deployment/notificacion-service -n sa-p6 --tail=50
```
**Tomar captura** -> `evidencias/09-logs-nats.png`. Buscar la linea del
evento publicado en pago-service y su consumo en notificacion-service.

## 6. Mostrar los Secrets sin exponer su contenido

```powershell
kubectl get secrets -n sa-p6
```
**Tomar captura** -> `evidencias/10-secrets.png`.

## 7. Si el auxiliar pide verlo "desde Google Cloud" directamente

Se puede mostrar sin depender de tu terminal, usando la consola web:

- Imagenes en Artifact Registry:
  https://console.cloud.google.com/artifacts/docker/cinetix-p6/us-central1/sa-p6
- Detalle del cluster (nodos, estado):
  https://console.cloud.google.com/kubernetes/clusters/details/us-central1-a/sa-p6-cluster/overview?project=cinetix-p6
- Cargas de trabajo (pods) en la consola:
  https://console.cloud.google.com/kubernetes/workload/overview?project=cinetix-p6

**Truco util**: arriba a la derecha en la consola de GCP hay un icono de
Cloud Shell (`>_`). Al abrirlo, ya viene con `gcloud`/`kubectl` autenticados
con tu cuenta - se puede correr `kubectl get pods -n sa-p6` ahi mismo, desde
el navegador, sin usar tu PowerShell. Es la forma mas directa de "probar que
funciona desde adentro de GCP" si el auxiliar lo pide.

## 8. Despues de que te califiquen

No borrar nada todavia si hay mas grupos por calificar ese mismo dia y el
auxiliar podria querer volver a revisar. Cuando el auxiliar confirme que ya
califico la practica, correr:
```powershell
.\scripts\eliminar-recursos.ps1
```
para no seguir generando costo en la cuenta de GCP.
