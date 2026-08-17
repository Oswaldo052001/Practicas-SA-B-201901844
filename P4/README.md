# CineTix - Practica 4: Diseno y toma de decisiones

Sistema de reservas y venta de boletos de cine basado en arquitectura de
microservicios. Curso Software Avanzado, Seccion B, carnet 201901844.

## Contenido

1. [Arquitectura general](docs/01-arquitectura.md)
2. [Diagrama de despliegue](docs/02-despliegue.md)
3. [Diagrama ER](docs/03-diagrama-er.md)
4. [Comunicacion entre servicios](docs/04-comunicacion-servicios.md)
5. Contratos de los microservicios: ver `postman/CineTix.postman_collection.json`
   para los servicios en Node.js, y `/swagger-ui.html` de cada servicio Java
   una vez levantado el sistema.

## Resumen de los microservicios

| Microservicio | Responsabilidad | Lenguaje | Puerto | Base de datos |
|---|---|---|---|---|
| auth-service | Autenticacion y roles (reutilizado de la Practica 2) | Node.js + TypeScript | 3001 | auth_db |
| pelicula-service | Catalogo de peliculas, funciones, salas y asientos | Java + Spring Boot | 3002 | pelicula_db |
| reserva-service | Reservas de asientos (REST y GraphQL) | Node.js + TypeScript | 3003 | reserva_db |
| pago-service | Procesamiento de pagos (REST y GraphQL) | Java + Spring Boot | 3004 | pago_db |
| notificacion-service | Envio de confirmaciones por correo | Node.js + TypeScript | 3005 | notificacion_db |
| api-gateway | Punto de entrada unico, enruta a todos los servicios | Node.js + TypeScript | 3000 | - |

Se cumple con el minimo de 4 microservicios (hay 5, sumando el reutilizado de
autenticacion) y con el minimo de 2 lenguajes distintos (Node.js/TypeScript y
Java/Spring Boot).

## Como ejecutar el sistema

1. Copiar `.env.example` a `.env` en la raiz del proyecto y generar valores
   reales para `JWT_SECRET` y `AES_SECRET_KEY`:

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Levantar todo el sistema con un solo comando:

   ```
   docker compose up --build
   ```

3. El API Gateway queda disponible en `http://localhost:3000`.

## Endpoints principales a traves del Gateway

| Metodo | Ruta | Descripcion | Requiere JWT |
|---|---|---|---|
| POST | /api/auth/registro | Registrar usuario | No |
| POST | /api/auth/login | Iniciar sesion | No |
| GET | /api/auth/perfil | Obtener perfil | Si |
| GET | /api/peliculas | Listar cartelera | No |
| GET | /api/funciones | Listar funciones | No |
| GET | /api/funciones/:id/asientos | Ver asientos disponibles de una funcion | No |
| POST | /api/reservas | Crear una reserva | Si |
| POST | /graphql/reservas | Endpoint GraphQL de reservas | Si |
| POST | /api/pagos | Procesar un pago | Si |
| POST | /graphql/pagos | Endpoint GraphQL de pagos | Si |
| POST | /api/notificaciones | Enviar una notificacion | Si |

## Principios SOLID aplicados

A continuacion se explica cada principio con palabras propias y se muestra
donde se aplico en el codigo real del proyecto.

### S - Principio de responsabilidad unica

Cada clase debe tener una sola razon para cambiar, es decir, debe encargarse
de una unica responsabilidad bien definida. Si una clase hace demasiadas
cosas, cualquier cambio en una de ellas obliga a tocar una clase que en teoria
no deberia verse afectada.

Evidencia: en `pelicula-service` se separo la logica de peliculas de la
logica de funciones y asientos en dos clases de servicio distintas en lugar
de una sola clase gigante:

- `services/PeliculaService.java`: solo administra el CRUD de peliculas.
- `services/FuncionService.java`: solo administra funciones y la
  disponibilidad de asientos.

Si en el futuro cambia la logica de disponibilidad de asientos, no hay que
tocar nada relacionado al catalogo de peliculas, y viceversa.

### O - Principio de abierto/cerrado

Las clases deben estar abiertas a extension pero cerradas a modificacion. Esto
significa que se debe poder agregar comportamiento nuevo sin tener que
modificar el codigo que ya funciona y ya fue probado.

Evidencia: en `notificacion-service` se creo la interfaz
`services/CanalNotificacion.ts` con un unico metodo `enviar`. La
implementacion actual es `services/CanalCorreoSimulado.ts`. Si en el futuro
se quiere agregar notificaciones por SMS o por notificacion push, basta con
crear una nueva clase que implemente `CanalNotificacion` (por ejemplo
`CanalSmsTwilio`), sin modificar `NotificacionService.ts`, que ya depende de
la interfaz y no de una implementacion concreta.

### L - Principio de sustitucion de Liskov

Cualquier implementacion de una interfaz o clase base debe poder usarse en
lugar de otra sin romper el comportamiento esperado por quien la consume. En
otras palabras, las clases hijas no deben debilitar lo que la clase padre
promete.

Evidencia: en `pago-service` se definio la interfaz `ProveedorPago` con el
metodo `procesar(pagoId, monto, metodoPago)` que siempre retorna una
referencia de tipo `String`. La implementacion actual,
`ProveedorPagoSimulado`, cumple exactamente ese contrato. `PagoService` recibe
un `ProveedorPago` por el constructor y lo usa sin saber si es la version
simulada o una version real contra un banco. Cualquier implementacion futura
(por ejemplo `ProveedorPagoStripe`) puede sustituir a
`ProveedorPagoSimulado` sin que `PagoService` note la diferencia, siempre que
respete el mismo contrato de entrada y salida.

### I - Principio de segregacion de interfaces

Es mejor tener varias interfaces pequenas y especificas que una sola interfaz
grande que obligue a las clases a implementar metodos que no necesitan.

Evidencia: en lugar de crear una unica interfaz gigante de "servicio
externo" que mezclara pagos, notificaciones y validaciones, se crearon
interfaces separadas y pequenas segun su proposito: `ProveedorPago` en
pago-service (un solo metodo, `procesar`) y `CanalNotificacion` en
notificacion-service (un solo metodo, `enviar`). Ninguna de las dos obliga a
implementar metodos que no le corresponden a su dominio.

### D - Principio de inversion de dependencias

Los modulos de alto nivel no deben depender de modulos de bajo nivel
directamente, ambos deben depender de abstracciones. Esto permite cambiar la
implementacion concreta sin tener que modificar la logica de negocio que la
usa.

Evidencia: `PagoService` (modulo de alto nivel, contiene la logica de
negocio de pagos) no depende directamente de `ProveedorPagoSimulado` (modulo
de bajo nivel, el detalle de como se llama al proveedor externo). En su
lugar, `PagoService` depende de la abstraccion `ProveedorPago`, y Spring
inyecta la implementacion concreta por el constructor. Lo mismo aplica entre
`NotificacionService` y `CanalNotificacion` en notificacion-service, y entre
los controladores de `auth-service` y la clase `AuthService`, que a su vez
depende de `UsuarioRepository` en lugar de escribir consultas SQL
directamente en la logica de negocio.

## Decisiones de diseno relevantes

- Cada microservicio tiene su propia base de datos independiente, siguiendo
  el patron database-per-service, aunque el enunciado lo marcaba como
  recomendado y no obligatorio.
- Toda la comunicacion pasa por el API Gateway, no hay comunicacion directa
  entre microservicios, siguiendo la recomendacion del enunciado y evitando
  el patron SOA que el auxiliar explicito que no aplica en esta practica.
- El proveedor de pago externo (simulado) se conecta unicamente con
  pago-service, nunca con la base de datos de pago-service, siguiendo la
  correccion que el auxiliar senalo como el error mas comun del semestre
  pasado.
- GraphQL se implemento en reserva-service (Node.js, con Apollo Server) y en
  pago-service (Java, con Spring for GraphQL), cubriendo un servicio de cada
  lenguaje.
