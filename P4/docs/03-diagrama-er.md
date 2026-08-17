# Diagrama ER - CineTix

Cada microservicio tiene su propia base de datos independiente. A continuacion se
muestra el modelo ER de cada una.

## auth_db (auth-service, reutilizado de Practica 2)

```mermaid
erDiagram
    USUARIO {
        int id PK
        string nombre_encriptado
        string correo_encriptado
        string correo_hash
        string password_hash
        string rol
        boolean activo
        timestamp creado_en
    }
```

## pelicula_db (pelicula-service)

```mermaid
erDiagram
    PELICULA {
        int id PK
        string titulo
        string genero
        int duracion_minutos
        string clasificacion
        string sinopsis
    }
    SALA {
        int id PK
        string nombre
        int capacidad
    }
    ASIENTO {
        int id PK
        int sala_id FK
        string fila
        int numero
    }
    FUNCION {
        int id PK
        int pelicula_id FK
        int sala_id FK
        timestamp fecha_hora
        decimal precio
    }
    ASIENTO_FUNCION {
        int id PK
        int funcion_id FK
        int asiento_id FK
        string estado
    }

    PELICULA ||--o{ FUNCION : tiene
    SALA ||--o{ FUNCION : se_usa_en
    SALA ||--o{ ASIENTO : contiene
    FUNCION ||--o{ ASIENTO_FUNCION : disponibiliza
    ASIENTO ||--o{ ASIENTO_FUNCION : referencia
```

## reserva_db (reserva-service)

```mermaid
erDiagram
    RESERVA {
        int id PK
        int usuario_id
        int funcion_id
        string estado
        timestamp creado_en
    }
    DETALLE_RESERVA {
        int id PK
        int reserva_id FK
        int asiento_funcion_id
        decimal precio_unitario
    }

    RESERVA ||--o{ DETALLE_RESERVA : incluye
```

Nota: `usuario_id` y `funcion_id` son referencias logicas a auth-service y a
pelicula-service respectivamente, no llaves foraneas fisicas, ya que cada
microservicio tiene su propia base de datos independiente.

## pago_db (pago-service)

```mermaid
erDiagram
    PAGO {
        int id PK
        int reserva_id
        decimal monto
        string estado
        string metodo_pago
        timestamp creado_en
    }
    TRANSACCION_PAGO {
        int id PK
        int pago_id FK
        string referencia_proveedor
        string resultado
        timestamp procesado_en
    }

    PAGO ||--o{ TRANSACCION_PAGO : genera
```

Nota: `reserva_id` es una referencia logica a reserva-service.

## notificacion_db (notificacion-service)

```mermaid
erDiagram
    NOTIFICACION {
        int id PK
        int usuario_id
        string tipo
        string destinatario
        string asunto
        string estado
        timestamp enviado_en
    }
```

Nota: `usuario_id` es una referencia logica a auth-service.
