# Estrategia de logging centralizado

En clase el auxiliar aclaró que el "login centralizado" que pide el enunciado se
refiere a logs, no a autenticación. La estrategia que se documenta aquí sigue esa
explicación.

## Registro local por microservicio

Cada microservicio escribe sus propios logs en su propia base de datos, en una
tabla llamada historico_operaciones. Esto respeta la regla de que ningún
microservicio puede acceder a la base de datos de otro: cada uno guarda su propio
historial de forma autónoma, sin depender de que otro servicio esté disponible
para poder registrar un evento.

Cada registro de historico_operaciones guarda:

- El payload completo de la operación.
- El usuario que la ejecutó.
- La fecha y hora.
- El tipo de petición, por ejemplo creación de lote o registro de paso de
  aprobación.
- El nivel del log.

## Centralización mediante eventos

Guardar el log localmente resuelve la trazabilidad interna de cada servicio, pero
no resuelve el requerimiento de que el sistema tenga un logging centralizado y
consultable desde un solo lugar. Para lograr esa centralización sin romper la
independencia de las bases de datos, cada microservicio publica de forma
asíncrona una copia de su evento de log hacia el canal de mensajería.
auditoria-service se suscribe a esos eventos y construye su propia base de datos
agregada, exclusivamente para consulta y auditoría.

De esta forma:

- Cada microservicio nunca deja de poder registrar sus propios logs, incluso si
  auditoria-service estuviera caído, porque su tabla local no depende de nadie
  más.
- La consulta centralizada existe en auditoria-service sin que este necesite
  acceso directo a las bases de datos de los demás.

## Niveles de log utilizados

Siguiendo la escala estándar fatal, error, warn, info, debug, trace y all, este
diseño usa principalmente:

- **error**: fallas que impiden completar una operación, por ejemplo un rechazo
  del sistema core bancario o un fallo de envío de correo tras agotar reintentos.
- **warn**: situaciones anómalas que no detienen el flujo, por ejemplo un
  reintento en curso.
- **info**: eventos normales del negocio, por ejemplo un paso de aprobación
  registrado correctamente.

Los niveles debug y trace quedan reservados para ambiente de desarrollo y no se
contemplan como parte del logging centralizado de producción, siguiendo el mismo
criterio explicado en clase.

## Manejo de errores no controlados

Cada microservicio implementa un manejador global de excepciones. Cuando ocurre
un error no controlado, ese manejador es quien genera el registro en
historico_operaciones con nivel error, de forma que ningún error pase sin
quedar documentado, sin necesidad de que cada función individual se encargue de
registrarlo manualmente.
