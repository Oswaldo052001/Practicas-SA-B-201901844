# Definición de microservicios

Se definen cinco microservicios. Cada uno posee su propia base de datos y ningún
microservicio consulta directamente la base de datos de otro. Toda comunicación
entre ellos ocurre por mensajería.

## transaccion-service

Responsable de recibir el archivo CSV con las transacciones masivas o pagos en
lote, validarlo contra las reglas internas del negocio y dejarlo listo para el
flujo de aprobación.

Funciones:
- Recibir el archivo CSV a través del API Gateway.
- Validar saldo disponible, límites de transacción, cuentas válidas y reglas
  básicas de prevención de fraude sobre cada registro del archivo.
- Guardar el archivo original en el almacenamiento externo y registrar su
  ubicación.
- Crear el lote de transacciones con estado inicial pendiente de aprobación.
- Exponer el historial consultable de lotes, incluyendo la opción de descarga
  del archivo original y del detalle de cada transacción.

Este servicio no aprueba ni rechaza transacciones por sí mismo, solo valida que
los datos sean correctos. La decisión de negocio sobre si el lote avanza queda en
manos de aprobacion-service.

## aprobacion-service

Responsable de orquestar el flujo de tres pasos maker-checker-authorizer sobre
cada lote de transacciones.

Funciones:
- Registrar la acción de cada uno de los tres roles sobre un lote determinado.
- Verificar que un mismo usuario no pueda ocupar dos roles distintos dentro del
  mismo lote, por ejemplo que quien creó el lote no pueda también autorizarlo.
- Cambiar el estado del lote conforme avanza en el flujo: pendiente, en revisión,
  autorizado o rechazado.
- Publicar un evento cuando el lote queda autorizado, para que otros servicios
  reaccionen sin que aprobacion-service necesite conocerlos.

## core-bancario-integration-service

Responsable de comunicar el sistema con el core bancario externo una vez que un
lote ha sido autorizado.

Funciones:
- Consumir el evento de lote autorizado.
- Transformar la información del lote al formato que espera el sistema core
  bancario externo.
- Enviar la solicitud al sistema externo y manejar reintentos ante fallas
  temporales.
- Registrar el resultado de la comunicación y publicar un evento de resultado,
  ya sea éxito o fallo, para que el resto del sistema quede enterado.

Este servicio concentra toda la complejidad de hablar con un sistema externo que
el equipo no controla, de forma que si ese sistema cambia su contrato, el impacto
se limita a este microservicio.

## notificacion-service

Responsable de avisar por correo electrónico a los clientes y beneficiarios
incluidos en un lote una vez que su transacción queda en proceso.

Funciones:
- Consumir el evento de lote enviado al core bancario.
- Obtener la lista de beneficiarios asociados al lote.
- Enviar el correo a cada beneficiario informando que su transacción está en
  proceso.
- Registrar el estado de envío de cada notificación, incluyendo reintentos en
  caso de fallo del proveedor de correo.

## auditoria-service

Responsable de mantener un registro centralizado y consultable de la actividad
técnica del sistema, correspondiente al requerimiento de logging centralizado y
auditable.

Funciones:
- Suscribirse a los eventos de log que cada microservicio publica.
- Almacenar cada evento con su origen, usuario, fecha, tipo de operación y nivel
  de severidad.
- Exponer una consulta centralizada de logs para efectos de auditoría, sin que
  quien consulta necesite conocer en qué microservicio ocurrió el evento
  originalmente.

## Por qué no se fusionan en menos servicios

Se evaluó reducir el diseño a los tres microservicios mínimos que pide el
enunciado, agrupando por ejemplo aprobación e integración con el core bancario en
un solo servicio. Se descartó esa opción porque esas dos responsabilidades
cambian por razones distintas: el flujo de aprobación responde a reglas internas
del banco, mientras que la integración con el core bancario responde al contrato
de un sistema externo que el equipo no controla. Mezclarlas en un solo servicio
generaría exactamente el tipo de acoplamiento y responsabilidad múltiple que la
rúbrica penaliza como God Object.
