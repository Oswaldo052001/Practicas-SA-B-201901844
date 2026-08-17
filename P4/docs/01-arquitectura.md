# Diagrama de Arquitectura - CineTix

Representa la comunicacion entre el cliente, el API Gateway, los microservicios
y el proveedor de pago externo. Toda la comunicacion pasa por el Gateway, no hay
comunicacion directa entre microservicios.

```mermaid
flowchart TB
    cliente[Cliente]

    subgraph gateway_box[API Gateway]
        gateway[API Gateway]
    end

    subgraph cluster[Cluster de microservicios]
        auth[auth-service]
        pelicula[pelicula-service]
        reserva[reserva-service]
        pago[pago-service]
        notificacion[notificacion-service]

        auth_db[(auth_db)]
        pelicula_db[(pelicula_db)]
        reserva_db[(reserva_db)]
        pago_db[(pago_db)]
        notificacion_db[(notificacion_db)]

        auth --> auth_db
        pelicula --> pelicula_db
        reserva --> reserva_db
        pago --> pago_db
        notificacion --> notificacion_db
    end

    proveedor_pago[Proveedor de pago externo]

    cliente --> gateway
    gateway --> auth
    gateway --> pelicula
    gateway --> reserva
    gateway --> pago
    gateway --> notificacion

    pago --> proveedor_pago
```

Notas:

- El cliente unicamente conoce al API Gateway, nunca a los microservicios directamente.
- Cada microservicio tiene su propia base de datos, ningun otro microservicio ni el
  proveedor externo accede a una base de datos que no sea la suya.
- El proveedor de pago externo esta fuera del cluster y solo se comunica con
  pago-service, nunca con la base de datos de pago-service.
- La comunicacion es unidireccional: el Gateway invoca a los microservicios, los
  microservicios no se invocan entre si.
