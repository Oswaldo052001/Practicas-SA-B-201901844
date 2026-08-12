# Práctica 3 - Diseño de Arquitectura de Microservicios Bancarios

Software Avanzado, Sección B, Universidad San Carlos de Guatemala
Carnet 201901844

## Contexto del problema

La institución bancaria donde labora el estudiante opera actualmente bajo un esquema
monolítico de procesamiento de transacciones. Este esquema provoca lentitud en épocas
de alta demanda: cierre de mes, pago de planillas masivas a clientes corporativos y
temporadas de impuestos. Se solicita el diseño inicial de una solución basada en
microservicios que resuelva este problema.

Esta práctica es exclusivamente de diseño y documentación. No se desarrolla código,
no hay una API en ejecución y no hay una base de datos desplegada. Todo lo entregado
son diagramas y documentos que sustentan las decisiones de arquitectura.

## Índice de documentos

1. [Diagrama de arquitectura general](docs/01-arquitectura-general.md)
2. [Definición de microservicios](docs/02-microservicios.md)
3. [Diagramas de entidad relación](docs/03-diagramas-er.md)
4. [Diagramas de clases UML](docs/04-diagramas-clases.md)
5. [Diagramas de secuencia UML](docs/05-diagramas-secuencia.md)
6. [Diagrama de componentes](docs/06-diagrama-componentes.md)
7. [Flujo de aprobación de tres pasos](docs/07-flujo-aprobacion.md)
8. [Estrategia de almacenamiento de archivos CSV](docs/08-estrategia-csv.md)
9. [Estrategia de logging centralizado](docs/09-estrategia-logging.md)
10. [Comunicación entre servicios](docs/10-comunicacion-servicios.md)
11. [Propuesta de API Gateway](docs/11-api-gateway.md)

## Resumen de los microservicios propuestos

El sistema se separa en cinco microservicios, cada uno con responsabilidad única y
base de datos independiente, evitando el antipatrón de God Object señalado en clase.

| Microservicio | Responsabilidad principal | Base de datos |
|---|---|---|
| transaccion-service | Ingesta y validación de archivos CSV, ciclo de vida de los lotes, historial consultable de transacciones | transaccion_db |
| aprobacion-service | Orquestación del flujo maker-checker-authorizer | aprobacion_db |
| core-bancario-integration-service | Envío de lotes aprobados al sistema core bancario externo, manejo de reintentos | core_bancario_db |
| notificacion-service | Envío de correos a clientes/beneficiarios cuando un lote es aprobado | notificacion_db |
| auditoria-service | Agregación centralizada de logs técnicos de todos los microservicios | auditoria_db |

Se decidió mantener cinco microservicios en lugar del mínimo de tres porque cada uno
representa una responsabilidad de negocio claramente distinta (ingesta de datos,
autorización, integración externa, comunicación con el cliente, auditoría). Fusionar
cualquiera de estos en uno solo generaría un servicio con más de una razón para
cambiar, lo cual viola el principio de responsabilidad única y es justo el tipo de
antipatrón que se penaliza en la rúbrica.

## Integración con la Práctica 2

El enunciado pide un servicio de autenticación OAuth corporativo con token de vida de
12 horas, complementado con el módulo de autenticación de la Práctica 2. La forma en
que se interpreta esto en este diseño es:

- Un proveedor de identidad OAuth corporativo (externo al sistema, por ejemplo un IdP
  ya existente en el banco) emite el token de 12 horas al autenticar al usuario.
- El módulo de autenticación desarrollado en la Práctica 2 (JWT en cookie httpOnly,
  roles admin y general, cifrado de datos sensibles) se reutiliza para gestionar
  permisos y accesos dentro del sistema, sin volver a desarrollarse. En este diseño
  aparece únicamente como componente existente que el API Gateway consulta para
  verificar identidad y rol antes de enrutar la petición.

No se rediseña ni se documenta a detalle el módulo de la Práctica 2 en esta entrega,
solo se referencia su integración, tal como indicó el auxiliar en clase.

## Justificación tecnológica

Para mantener coherencia con las Prácticas 1 y 2, la descripción técnica de este
diseño asume el mismo stack: Node.js con TypeScript 5.6.3, Express y PostgreSQL 16
en contenedores Docker, uno por microservicio. Para la comunicación asíncrona se
propone NATS, ya que fue el ejemplo desarrollado en clase y se ajusta bien a un
sistema con varios microservicios livianos.

| Aspecto | Ventaja | Desventaja |
|---|---|---|
| Node.js + TypeScript | Un solo lenguaje para todos los microservicios, tipado fuerte, curva de aprendizaje baja porque ya se usó en P1 y P2 | Rendimiento inferior a lenguajes compilados como Go para cargas de cómputo intensivo, algo que no aplica aquí porque el trabajo es principalmente de I/O |
| Express | Liviano, minimalista, rápido de levantar por microservicio | Requiere configurar manualmente varias cosas que otros frameworks traen por defecto, como validación o inyección de dependencias |
| PostgreSQL por microservicio | Consistencia transaccional fuerte dentro de cada dominio, ya conocido del equipo | Al tener una base de datos por servicio se pierde la posibilidad de hacer joins entre dominios, obligando a manejar consistencia eventual |
| NATS como broker | Baja latencia, patrón request-reply nativo, ligero de operar | Sin persistencia de mensajes por defecto a diferencia de Kafka, por lo que si se requiere retención larga habría que usar NATS JetStream |

Esta tabla es la base de la sección "Descripción técnica de tecnologías y patrones"
de la rúbrica y se puede ampliar libremente al momento de la calificación.
