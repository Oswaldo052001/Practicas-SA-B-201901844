# Comunicación entre servicios

El enunciado de esta práctica permite comunicación REST y/o mensajería asíncrona,
a diferencia del proyecto del curso donde la comunicación asíncrona es
obligatoria en su totalidad. En este diseño se usan ambas, según la naturaleza de
cada interacción.

## Comunicación síncrona (REST)

Se usa REST únicamente entre el API Gateway y los dos microservicios que deben
responderle algo al usuario en el momento: transaccion-service, para confirmar
que un archivo se cargó y validó correctamente, y aprobacion-service, para
confirmar que un paso de aprobación quedó registrado. En ambos casos el usuario
necesita saber de inmediato si su acción tuvo éxito, por lo que un modelo de
petición-respuesta es el adecuado.

## Comunicación asíncrona (mensajería)

Se usa mensajería asíncrona, con NATS como propuesta de broker, para todo lo que
ocurre después de que un lote queda autorizado: el envío al core bancario, la
notificación a los clientes y el registro centralizado de auditoría. Ninguno de
estos tres pasos necesita bloquear al usuario ni a aprobacion-service, y
desacoplarlos permite que una falla temporal en, por ejemplo, el proveedor de
correo, no afecte al resto del sistema.

Se eligió el patrón de eventos, publicando hechos ya ocurridos como lote
autorizado o lote enviado al core bancario, en lugar de comandos dirigidos a un
servicio específico. Esto permite agregar en el futuro nuevos consumidores de
esos eventos, por ejemplo un servicio de reportes, sin modificar a
aprobacion-service ni a core-bancario-integration-service.

## Correlación de mensajes

Cada evento publicado incluye el identificador del lote como correlation id. Esto
permite que auditoria-service, al consultar el historial de logs, pueda
reconstruir todo el recorrido de un lote específico a través de los distintos
microservicios, incluso cuando cada uno de ellos procesó el evento en un momento
distinto y de forma independiente.

## Por qué no se usa comunicación síncrona entre microservicios

Ningún microservicio le hace una petición HTTP directa a otro microservicio. Si
core-bancario-integration-service tuviera que esperar una respuesta síncrona de
aprobacion-service, ambos quedarían acoplados en el tiempo: una lentitud o caída
de aprobacion-service afectaría directamente a integracion, y viceversa. Usar el
canal de mensajería para esta comunicación evita ese acoplamiento y es coherente
con lo que se explicó en clase sobre por qué se prefiere mensajería entre
microservicios.
