# Propuesta de API Gateway

## Responsabilidades

El API Gateway es el único punto de entrada al sistema para el cliente. Sus
responsabilidades son:

- Enrutar cada petición hacia el microservicio correspondiente: transaccion-
  service o aprobacion-service.
- Verificar la identidad del usuario contra el módulo de autenticación de la
  Práctica 2 antes de dejar pasar cualquier petición.
- Aplicar control de acceso según el rol del usuario, por ejemplo que solo
  usuarios con rol maker puedan cargar archivos, y que checker y authorizer
  solo puedan registrar sus respectivos pasos.
- Aplicar rate limiting para evitar que un solo cliente sature el sistema con
  cargas masivas de archivos.
- Centralizar el manejo de errores de entrada, por ejemplo formato de petición
  inválido, antes de que la petición llegue a un microservicio.

## Qué no hace el API Gateway

El API Gateway no contiene lógica de negocio. No valida transacciones, no
conoce el flujo de aprobación y no se comunica con el core bancario, el
proveedor de correo ni auditoria-service. Su única función es autenticar,
autorizar, enrutar y proteger, tal como se explicó en clase sobre la diferencia
entre un API Gateway y un load balancer: el load balancer solo distribuye
tráfico, mientras que el Gateway además autentica, limita tasa y enruta según el
contenido de la petición.

## Contratos expuestos

El API Gateway expone contratos hacia el cliente en formato REST, documentados
mediante una colección de Postman o una especificación OpenAPI, siguiendo el
mismo criterio usado en la Práctica 1. Cada carpeta de la colección corresponde
a uno de los microservicios que el Gateway expone: carga y consulta de
transacciones, y registro de pasos de aprobación.
