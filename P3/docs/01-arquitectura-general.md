# Diagrama de arquitectura general

Este diagrama representa el sistema a alto nivel, sin nombrar tecnologías
específicas, tal como lo pidió el auxiliar en clase. Su propósito es mostrar qué
hace el sistema y cómo se relacionan sus piezas, no cómo está implementado. El
detalle tecnológico se documenta aparte en el diagrama de despliegue y en la
justificación tecnológica del README.

![Arquitectura](/Imagenes/arquitectura.png)

## Justificación

El cliente nunca interactúa directamente con los microservicios. Todo pasa por un
único punto de entrada, que además es el único lugar del sistema que conoce que
existe un mecanismo de autenticación corporativa. Esto centraliza la seguridad y
evita que cada microservicio tenga que reimplementar validación de identidad.

La ingesta de archivos y la aprobación son los dos únicos servicios que reciben
peticiones directas del punto de entrada, porque son las únicas operaciones que
requieren una respuesta inmediata al usuario, ya que el usuario necesita saber si
su archivo se cargó correctamente o si su aprobación quedó registrada.

Todo lo que ocurre después de una aprobación (enviar al core bancario, notificar al
cliente, dejar constancia en auditoría) se desacopla mediante un canal de
comunicación interno, de forma que ninguno de esos tres servicios depende de que el
usuario esté esperando una respuesta. Esto reduce el acoplamiento temporal, evita que
una falla en el sistema core bancario externo bloquee al usuario, y permite que cada
servicio escale de forma independiente según su propia carga.
