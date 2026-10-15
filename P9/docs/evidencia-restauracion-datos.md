# Evidencia: restauración de datos (Práctica 9)

Prueba del 2026-10-14 (hora local de Guatemala) sobre el cluster reconstruido
con `terraform apply`. Origen: respaldo `backup-pre-dr-test`
(snapshot 2026-09-24 03:57:20 UTC) con el usuario `prueba.dr@example.com`.

Procedimiento: pausar el auto-sync de `sa-platform-root` y `sa-platform`,
`kubectl scale statefulset sa-platform-postgresql --replicas=0`, borrar el PVC
vacío, crear el `Restore` `restore-dr-final2` (solo PVC y PV de `sa-p8`),
esperar la fase final, subir Postgres a 1 y consultar.

Resultado del Restore: `PartiallyFailed` (1 error, 1 warning, 4/4 items
restaurados). El error vino de un PV huérfano en `Terminating` que retrasó la
creación del PV; una vez liberado, el PVC quedó `Bound`:

```
data-sa-platform-postgresql-0   Bound   pvc-dd3f6b5a-713b-43d0-b57d-f00f0418a02e   1Gi
```

Consulta posterior en `auth_db` (18:55):

```
 count
-------
     1

 id |        correo         |                        password_hash                         |   rol   |         creado_en
----+-----------------------+--------------------------------------------------------------+---------+----------------------------
  1 | prueba.dr@example.com | $2b$10$I.zcOJ3jRt9zXcBryD77duw4FrJbHGsosbeqb5O7udr7RREYJ0IgO | cliente | 2026-09-24 03:56:58.891605
```

Cronología: Restore lanzado 18:48:16, PVC `Bound` 18:53:56, datos verificados
18:55. Antes de esta corrida, un primer intento (18:30) con el StatefulSet
vivo falló por la carrera descrita en el informe, sección 5.
