# Comunicacion entre servicios - CineTix

## Regla general

Toda comunicacion pasa por el API Gateway. Ningun microservicio invoca directamente
a otro microservicio, y ningun microservicio ni servicio externo accede a la base
de datos de otro microservicio. Esto evita los dos errores mas comunes senalados
por el auxiliar en clase:

1. Un servicio externo con acceso directo a la base de datos de un microservicio.
2. Comunicacion de tipo "todos con todos" propia de SOA, en lugar de una
   comunicacion clara y unidireccional entre cliente y microservicios.

## Flujo tipico de uso

1. El cliente inicia sesion contra `auth-service` a traves del Gateway
   (`POST /api/auth/login`). Recibe un JWT en una cookie httpOnly.
2. El cliente consulta la cartelera y las funciones disponibles en
   `pelicula-service` a traves del Gateway (`GET /api/peliculas`,
   `GET /api/funciones`). Esta consulta no requiere autenticacion.
3. El cliente crea una reserva de asientos en `reserva-service`, enviando el
   JWT (`POST /api/reservas` o mutacion GraphQL `crearReserva`). El Gateway
   valida el JWT antes de enrutar la peticion.
4. El cliente procesa el pago de la reserva en `pago-service`
   (`POST /api/pagos` o mutacion GraphQL `crearPago`). `pago-service` se
   comunica con el proveedor de pago externo (fuera del cluster) y nunca le
   da acceso a su base de datos.
5. Una vez confirmado el pago, el cliente (o el propio frontend/consumidor del
   API) invoca a `notificacion-service` (`POST /api/notificaciones`) para
   enviar la confirmacion por correo.

## Por que no hay comunicacion directa entre microservicios

El enunciado marca la comunicacion directa entre microservicios como algo
"no requerido, pero recomendado" no implementarla. En este diseno se opto por
que toda orquestacion la resuelva el consumidor del API (a traves del Gateway),
manteniendo cada microservicio completamente independiente y desacoplado. Esto
simplifica el sistema para el alcance de esta practica y evita acoplar
reserva-service con pago-service o con notificacion-service.

## Autenticacion en el Gateway

El API Gateway valida el JWT emitido por `auth-service` antes de enrutar
peticiones hacia `reserva-service`, `pago-service` y `notificacion-service`.
Las rutas de `pelicula-service` son publicas ya que corresponden a la
consulta de cartelera, que no requiere que el usuario este autenticado.
