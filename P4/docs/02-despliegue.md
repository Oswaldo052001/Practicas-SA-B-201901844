# Diagrama de Despliegue - CineTix

Representa como se despliegan los contenedores Docker mediante Docker Compose, los
puertos expuestos y las dependencias entre contenedores.

```mermaid
flowchart TB
    subgraph host[Docker host - docker-compose]
        subgraph gw_c[Contenedor: api-gateway]
            gw[Node.js API Gateway<br/>puerto 3000]
        end

        subgraph auth_c[Contenedor: auth-service]
            auth[Node.js + TS<br/>puerto 3001]
        end
        subgraph auth_db_c[Contenedor: auth-db]
            authdb[(PostgreSQL 16<br/>puerto 5433)]
        end

        subgraph pelicula_c[Contenedor: pelicula-service]
            pelicula[Java Spring Boot<br/>puerto 3002]
        end
        subgraph pelicula_db_c[Contenedor: pelicula-db]
            peliculadb[(PostgreSQL 16<br/>puerto 5434)]
        end

        subgraph reserva_c[Contenedor: reserva-service]
            reserva[Node.js + TS + GraphQL<br/>puerto 3003]
        end
        subgraph reserva_db_c[Contenedor: reserva-db]
            reservadb[(PostgreSQL 16<br/>puerto 5435)]
        end

        subgraph pago_c[Contenedor: pago-service]
            pago[Java Spring Boot + GraphQL<br/>puerto 3004]
        end
        subgraph pago_db_c[Contenedor: pago-db]
            pagodb[(PostgreSQL 16<br/>puerto 5436)]
        end

        subgraph notif_c[Contenedor: notificacion-service]
            notif[Node.js + TS<br/>puerto 3005]
        end
        subgraph notif_db_c[Contenedor: notificacion-db]
            notifdb[(PostgreSQL 16<br/>puerto 5437)]
        end
    end

    cliente[Cliente / Postman] -->|HTTP puerto 3000| gw

    gw -->|HTTP| auth
    gw -->|HTTP| pelicula
    gw -->|HTTP y GraphQL| reserva
    gw -->|HTTP y GraphQL| pago
    gw -->|HTTP| notif

    auth --> authdb
    pelicula --> peliculadb
    reserva --> reservadb
    pago --> pagodb
    notif --> notifdb

    proveedor_pago[Proveedor de pago externo]
    pago -->|HTTPS| proveedor_pago

    net[(red docker: cinetix-network)]
    gw -.-> net
    auth -.-> net
    pelicula -.-> net
    reserva -.-> net
    pago -.-> net
    notif -.-> net
```

Notas:

- Todos los contenedores se levantan con un unico comando `docker compose up`.
- Cada microservicio y su base de datos corren en contenedores separados,
  comunicados dentro de la misma red interna de Docker (`cinetix-network`).
- Solo el API Gateway expone su puerto hacia el cliente externo (puerto 3000).
  Los microservicios y bases de datos son alcanzables unicamente dentro de la
  red interna de Docker.
- Cada base de datos usa un volumen propio para persistencia.
