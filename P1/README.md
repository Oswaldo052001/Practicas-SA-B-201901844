# Practica 1 - Principios SOLID y Uso de IA para Codigo Seguro

API REST para la gestion de solicitudes operativas de una academia ficticia, desarrollada con Node.js, TypeScript, Express y PostgreSQL.

## Contenido

- [Descripcion del proyecto](#descripcion-del-proyecto)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Como levantar el proyecto](#como-levantar-el-proyecto)
- [Endpoints disponibles](#endpoints-disponibles)
- [Principios SOLID aplicados](#principios-solid-aplicados)

## Descripcion del proyecto

El sistema permite registrar, consultar, actualizar y eliminar solicitudes operativas de una academia. Cada solicitud representa una peticion interna con un titulo, un area solicitante, una prioridad, un costo estimado y un estado.

## Tecnologias utilizadas

- Node.js con TypeScript
- Express como framework HTTP
- PostgreSQL 16 como base de datos, ejecutado en un contenedor Docker
- pg como driver de conexion a la base de datos

## Como levantar el proyecto

1. Levantar la base de datos con Docker:
   
   docker compose up -d
2. Instalar dependencias:
   
   npm install
3. Crear la tabla en la base de datos (una sola vez):
   
   Get-Content src/database/schema.sql | docker exec -i academia_db psql -U academia_user -d academia_db
4. Correr el servidor en modo desarrollo:
   
   npm run dev

## Endpoints disponibles

| Metodo | Ruta                          | Descripcion                              |
|--------|-------------------------------|-------------------------------------------|
| GET    | /api/solicitudes              | Obtiene todas las solicitudes             |
| POST   | /api/solicitudes              | Registra una nueva solicitud              |
| PUT    | /api/solicitudes/:id          | Actualiza completamente una solicitud     |
| DELETE | /api/solicitudes/:id          | Elimina una solicitud                     |
| PATCH  | /api/solicitudes/:id/estado   | Actualiza unicamente el estado            |

## Principios SOLID aplicados

### Single Responsibility Principle (SRP)

Cada clase del proyecto tiene una unica razon para cambiar. Por ejemplo, `PostgresSolicitudRepository` solo se encarga de la comunicacion con la base de datos, sin conocer nada sobre reglas de negocio ni sobre HTTP:

```
export class PostgresSolicitudRepository implements ISolicitudRepository {
  constructor(private pool: Pool) {}

  async obtenerTodas(): Promise<Solicitud[]> {
    const resultado = await this.pool.query("SELECT * FROM solicitudes ORDER BY id");
    return resultado.rows.map(this.mapearFila);
  }
  // ...
}
```

Por su parte, `SolicitudService` solo contiene la logica de negocio (validaciones, reglas), y `SolicitudController` solo se encarga de traducir peticiones HTTP hacia el service y de convertir errores en respuestas HTTP. Si cambia la forma de guardar datos, solo se toca el repository. Si cambia una regla de negocio, solo se toca el service.

### Open/Closed Principle (OCP)

El sistema esta abierto a extension pero cerrado a modificacion gracias al uso de interfaces. `ISolicitudRepository` define el contrato que cualquier repositorio debe cumplir:

```
export interface ISolicitudRepository {
  obtenerTodas(): Promise<Solicitud[]>;
  crear(datos: CrearSolicitudDTO): Promise<Solicitud>;
  actualizar(id: string, datos: CrearSolicitudDTO): Promise<Solicitud | null>;
  eliminar(id: string): Promise<boolean>;
  actualizarEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud | null>;
  obtenerPorId(id: string): Promise<Solicitud | null>;
}
```

Si en el futuro se necesita otra fuente de datos (por ejemplo, un repositorio en memoria para pruebas, o MySQL en lugar de PostgreSQL), basta con crear una nueva clase que implemente esta interfaz. Ni el service ni el controller necesitan modificarse.

### Liskov Substitution Principle (LSP)

Como `SolicitudService` depende de la interfaz `ISolicitudRepository` y no de `PostgresSolicitudRepository` directamente, cualquier clase que implemente correctamente esa interfaz puede sustituir a la implementacion actual sin romper el comportamiento del programa:

```
export class SolicitudService implements ISolicitudService {
  constructor(private repositorio: ISolicitudRepository) {}
  // el service nunca sabe que existe PostgreSQL detras
}
```

Esto significa que se podria crear, por ejemplo, una clase `RepositorioSolicitudEnMemoria implements ISolicitudRepository` para pruebas unitarias, y sustituirla en el constructor del service sin que nada mas en el sistema deje de funcionar.

### Interface Segregation Principle (ISP)

En lugar de tener una sola interfaz gigante para todos los datos de una solicitud, se separaron los DTOs (Data Transfer Objects) segun lo que cada operacion realmente necesita:

```
export interface CrearSolicitudDTO {
  titulo: string;
  areaSolicitante: string;
  prioridad: number;
  costoEstimado: number;
  estado: EstadoSolicitud;
}

export interface ActualizarEstadoDTO {
  estado: EstadoSolicitud;
}
```

El endpoint de cambio de estado no recibe ni depende de todos los campos de una solicitud, solo del campo `estado`, que es lo unico que necesita para cumplir su funcion.

### Dependency Inversion Principle (DIP)

Los modulos de alto nivel (`SolicitudService`, `SolicitudController`) no dependen de implementaciones concretas, sino de abstracciones. El ensamblado de las dependencias reales ocurre en un unico lugar, `app.ts`:

```
const repositorio = new PostgresSolicitudRepository(pool);
const servicio = new SolicitudService(repositorio);
const controlador = new SolicitudController(servicio);
```

`SolicitudService` recibe `repositorio` a traves de su constructor, sin crear su propia instancia de `PostgresSolicitudRepository`. Esto invierte la dependencia: en lugar de que el service dependa de una clase concreta de bajo nivel, ambos dependen de la abstraccion `ISolicitudRepository`.

## Prevencion de inyeccion SQL

Todas las consultas hacia la base de datos usan parametros preparados (`$1`, `$2`, etc.) en lugar de concatenar valores directamente en el texto SQL, lo que elimina el riesgo de inyeccion SQL:

```
const resultado = await this.pool.query(
  "UPDATE solicitudes SET estado = $1 WHERE id = $2 RETURNING *",
  [estado, id]
);
```

