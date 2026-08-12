# Diagramas de entidad relación

Cada microservicio tiene su propio esquema, sin llaves foráneas hacia bases de
datos de otros microservicios. Cuando un microservicio necesita referenciar una
entidad de otro dominio, guarda únicamente el identificador, nunca una relación
formal de base de datos.

## transaccion_db


![dbTransaccion](/Imagenes/base1.png)

## aprobacion_db

![dbAprobacion](/Imagenes/Aprobaciondb.png)

## core_bancario_db

![dbcore](/Imagenes/dbcore.png)

## notificacion_db

![dbnotificacion](/Imagenes/dbnotificacion.png)

## auditoria_db


![dbauditoria](/Imagenes/dbauditoria.png)

Los identificadores como `lote_id` que aparecen repetidos en varios esquemas, por
ejemplo en aprobacion_db, core_bancario_db y notificacion_db, no son llaves
foráneas de base de datos. Son identificadores de correlación que cada
microservicio recibe dentro del evento o de la petición, y que le permiten saber
a qué lote pertenece la operación sin necesitar acceso directo a
transaccion_db.
