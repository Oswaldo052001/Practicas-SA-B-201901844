# Flujo de aprobación de tres pasos

El enunciado exige un esquema maker-checker-authorizer, donde tres usuarios
distintos deben intervenir antes de que un lote de transacciones sea enviado al
sistema core bancario.

## Roles

- **Maker**: crea o carga el lote de transacciones. Es quien sube el archivo CSV
  o quien inicia formalmente el proceso de aprobación sobre un lote ya validado.
- **Checker**: revisa el contenido del lote y las validaciones realizadas por
  transaccion-service, y decide si el lote está correcto para continuar.
- **Authorizer**: da la autorización final. Solo después de su aprobación el
  lote puede enviarse al sistema core bancario.

## Regla de segregación de funciones

Un mismo usuario no puede ocupar más de un rol dentro del mismo lote. Si el
usuario que cargó el archivo intenta actuar como checker o authorizer sobre ese
mismo lote, la operación debe rechazarse. Esta validación se hace en
aprobacion-service, comparando el usuario_id de cada paso contra los pasos
anteriores del mismo flujo.

## Estados del lote


![EstadoLote](/Imagenes/EstadoLote.png)

## Qué ocurre al completarse el paso tres

Cuando el authorizer aprueba, aprobacion-service publica un evento de lote
autorizado en el canal de mensajería. A partir de ese momento, aprobacion-service
ya no tiene ninguna responsabilidad más sobre ese lote. core-bancario-integration-
service toma el evento y continúa el flujo hacia el sistema externo, y una vez
que ese envío se confirma, notificacion-service se encarga de avisar a los
beneficiarios. Este desacoplamiento es intencional: si el envío al core bancario
tarda o falla temporalmente, eso no bloquea ni afecta el registro de la
aprobación, que ya quedó completada.
