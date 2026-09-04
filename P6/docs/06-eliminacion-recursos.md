# Eliminacion de recursos - Practica 6

Procedimiento y evidencia de que todos los recursos de nube se eliminaron
al finalizar la practica, tal como exige el enunciado.

## Orden de eliminacion

`scripts/eliminar-recursos.ps1` hace, en este orden:

1. `helm uninstall sa-platform -n sa-p6` - elimina Deployments, StatefulSets,
   Services, ConfigMaps, Secrets, NetworkPolicies, HPA y PDB creados por el
   chart.
2. `kubectl delete namespace sa-p6` - por si queda algo suelto (PVCs
   especialmente, que Helm no siempre borra si `persistence.enabled` estaba
   activo).
3. `gcloud container clusters delete sa-p6-cluster --zone us-central1-a` -
   elimina el cluster completo (los nodos, que son lo que realmente genera
   costo por hora).
4. `gcloud artifacts repositories delete sa-p6 --location=us-central1` -
   elimina el repositorio de imagenes (opcional, casi no genera costo, pero
   deja todo limpio).

## Verificacion de que no quedo nada corriendo

```powershell
gcloud container clusters list --project <PROJECT_ID>
gcloud artifacts repositories list --project <PROJECT_ID>
gcloud compute disks list --project <PROJECT_ID>
gcloud compute forwarding-rules list --project <PROJECT_ID>
```

Las cuatro listas deben quedar vacias (o sin recursos relacionados a
`sa-p6`/`sa-p6-cluster`).

- [ ] `evidencias/12-recursos-eliminados.png` - salida de los 4 comandos
      anteriores, mostrando que no queda ningun recurso de esta practica.

## Nota

Estas capturas se toman **despues** de haber tomado ya todas las evidencias
de funcionamiento (`04-evidencias.md`): una vez eliminado el cluster no se
puede volver a capturar evidencia de funcionamiento sin desplegar todo de
nuevo (lo cual generaria costo adicional otra vez).
