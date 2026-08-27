# Evidencias Requeridas

Completar cada seccion con la salida real de tu terminal y/o capturas de
pantalla despues de ejecutar los comandos de `02-comandos-reproducibles.md`
en tu cluster local. No se incluyen evidencias inventadas: cada seccion debe
llenarse con la ejecucion real en tu maquina.

## 1. helm history con rollback

```
(pegar aqui la salida de: helm history sa-platform -n sa-p5)
```

Explicacion de que cambio se hizo entre la version 1 y la version 2, y por
que se decidio hacer rollback:

_________________________________________________

## 2. Escalado por HPA bajo carga

```
(pegar aqui la salida de: kubectl get hpa -n sa-p5 -w durante la prueba de carga)
```

```
(pegar aqui la salida de: kubectl get pods -n sa-p5 -w mostrando el aumento
y posterior disminucion de replicas)
```

## 3. Persistencia tras el borrado del pod de base de datos

```
(pegar aqui: SELECT antes del borrado)
```

```
(pegar aqui: kubectl delete pod sa-platform-postgresql-0)
```

```
(pegar aqui: SELECT despues de que el pod se recreo, mostrando los mismos datos)
```

## 4. Bloqueo por NetworkPolicy

```
(pegar aqui la salida del intento de conexion desde el pod no autorizado,
mostrando el timeout o rechazo de conexion)
```

## 5. Actualizacion sin downtime (RollingUpdate)

Describir el procedimiento: mientras se ejecutaba `helm upgrade`, se mantuvo
un loop de peticiones continuas contra el gateway (por ejemplo con
`while ($true) { curl http://<gateway>/health; sleep 1 }` en PowerShell) y
se verifico que ninguna peticion devolvio error durante el despliegue.

```
(pegar aqui la salida del loop de peticiones durante el upgrade)
```

## 6. Comportamiento del broker con el consumidor caido

```
(pegar aqui los logs de notificacion-service mostrando que proceso los
mensajes acumulados al reiniciar, sin perdida de informacion)
```
