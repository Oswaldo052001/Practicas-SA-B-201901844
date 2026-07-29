# Documentacion de Prompts de IA

Este documento registra el uso de herramientas de Inteligencia Artificial generativa (Claude, de Anthropic) durante el desarrollo de la Practica 1, incluyendo los prompts utilizados, las respuestas obtenidas y el analisis critico realizado sobre cada una.

## Prompt 1: Diseno de la arquitectura en capas

### Prompt utilizado

```
Necesito construir una API REST en Node.js con TypeScript y Express que
gestione solicitudes operativas de una academia (CRUD completo mas un
endpoint para actualizar solo el estado), conectada a PostgreSQL.
El proyecto debe aplicar los 5 principios SOLID de forma identificable.
Propon una estructura de carpetas y explica por que cada capa ayuda
a cumplir SOLID.
```

### Respuesta obtenida

La IA propuso separar el proyecto en capas: `models`, `repositories`, `services`, `controllers`, `routes` y `database`, cada una con una unica responsabilidad. Explico que esta separacion favorece directamente Single Responsibility (cada capa cambia por una sola razon) y Dependency Inversion (las capas superiores dependen de interfaces, no de implementaciones concretas de las capas inferiores).

### Analisis y ajustes realizados

La estructura propuesta se acepto tal cual, ya que coincide con patrones de arquitectura en capas vistos previamente en el curso. El unico ajuste manual fue agregar el archivo `errors.ts` dentro de `services`, para tener clases de error de negocio propias (`SolicitudNoEncontradaError`, `DatosInvalidosError`) que permitieran al controller traducir errores a codigos HTTP sin necesidad de comparar mensajes de texto, lo cual habria sido una mala practica.

## Prompt 2: Implementacion del repositorio con prevencion de inyeccion SQL

### Prompt utilizado

```
Escribe la implementacion de un repositorio de PostgreSQL para la entidad
Solicitud, usando el driver pg. Debe implementar una interfaz
ISolicitudRepository con los metodos obtenerTodas, obtenerPorId, crear,
actualizar, actualizarEstado y eliminar. Es indispensable prevenir
inyeccion SQL y mapear correctamente entre snake_case (base de datos)
y camelCase (TypeScript).
```

### Respuesta obtenida

La IA genero la clase `PostgresSolicitudRepository`, usando siempre consultas parametrizadas (`$1`, `$2`, etc.) en lugar de concatenar valores directamente en las cadenas SQL, y un metodo privado `mapearFila` para centralizar la conversion entre las columnas de la base de datos y el modelo de TypeScript.

### Analisis y ajustes realizados

Se reviso cada consulta generada para confirmar que ningun valor recibido del cliente se insertara directamente en el texto SQL. Se verifico tambien que el metodo `eliminar` retornara un booleano basado en `rowCount`, para que el service pudiera diferenciar entre "no existe" y "se elimino correctamente". No fue necesario corregir vulnerabilidades, ya que el codigo generado ya usaba parametros preparados desde el principio, pero se valido manualmente cada metodo comparandolo contra los ejemplos de OWASP sobre prevencion de inyeccion SQL.

## Prompt 3: Resolucion de un error de tipado en TypeScript con Express

### Prompt utilizado

```
Estoy usando Request de express en TypeScript y me marca este error:
"Argument of type 'string | string[]' is not assignable to parameter
of type 'string'". Esto ocurre en un metodo de un controller donde
uso req.params.id para llamar a un metodo del service. Como lo
resuelvo de forma correcta sin usar "any"?
```

### Respuesta obtenida

La IA explico que el error ocurre porque, sin tipar explicitamente los parametros de ruta, TypeScript no puede garantizar que `req.params.id` sea siempre un `string` simple. La solucion propuesta fue tipar el `Request` de forma generica, indicando la forma exacta de los parametros: `Request<{ id: string }>`, en lugar de usar `any` o hacer un cast forzado.

### Analisis y ajustes realizados

Se aplico la correccion en los tres metodos del controller que reciben un `id` por la URL (`actualizar`, `eliminar`, `cambiarEstado`), dejando sin cambios los metodos que no usan parametros de ruta (`listar`, `crear`). Se prefirio esta solucion sobre usar `any` porque mantiene la seguridad de tipos que aporta TypeScript, que es justamente uno de los objetivos de la practica en cuanto a codigo seguro.

