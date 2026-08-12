# Estrategia de almacenamiento de archivos CSV

## Flujo de carga

1. El usuario sube el archivo CSV a través del API Gateway hacia
   transaccion-service.
2. transaccion-service valida primero la estructura del archivo: encabezados
   esperados, tipos de dato por columna y que no existan filas vacías o
   duplicadas.
3. Solo si la estructura es válida, se procede a validar cada transacción contra
   las reglas de negocio: saldo disponible, límites de transacción, cuentas
   válidas y reglas básicas de prevención de fraude.
4. El archivo original, sin modificar, se sube a un almacenamiento externo de
   objetos, del tipo S3, GCP Storage o un servidor FTP, según lo que decida el
   equipo al momento de implementar.
5. transaccion_db guarda únicamente la ubicación del archivo, nunca el archivo
   en sí. Esto mantiene la base de datos liviana y delega el almacenamiento de
   archivos grandes a un servicio pensado para eso.

## Por qué no se guarda el archivo en la base de datos

Guardar archivos binarios o de texto plano de gran tamaño directamente en
PostgreSQL degrada el rendimiento de la base de datos y complica los respaldos.
Separar el archivo del registro estructurado permite que la base de datos se
mantenga rápida para las consultas de historial, mientras que el almacenamiento
externo se encarga de servir el archivo cuando alguien pide descargarlo.

## Descarga desde el historial

Cuando un usuario consulta el historial de lotes y solicita descargar uno,
transaccion-service no sirve el archivo directamente. En su lugar, genera una
URL firmada y temporal hacia el almacenamiento externo, o hace de proxy hacia el
servidor FTP según la tecnología elegida. Esto evita que transaccion-service
tenga que cargar archivos completos en memoria solo para reenviarlos.

## Validación de duplicados

Cada archivo cargado se identifica por un hash de su contenido. Si se sube un
archivo con el mismo hash que uno ya procesado, transaccion-service rechaza la
carga y responde indicando que ese lote ya existe, evitando procesar el mismo
lote de transacciones dos veces por error.
