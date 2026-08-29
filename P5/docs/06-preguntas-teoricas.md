# Preguntas Teoricas

Nota importante: la rubrica de esta practica exige que las respuestas sean de
analisis propio y penaliza explicitamente respuestas "copiadas de
internet/IA". Estas respuestas son un punto de partida tecnico correcto;
antes de entregar, reescribelas con tus propias palabras y, si quieres,
agrega un ejemplo o experiencia propia del despliegue que hiciste.

## 1. Que es Helm y que problema resuelve frente a los manifiestos sueltos

Helm es el gestor de paquetes de Kubernetes: empaqueta un conjunto de
manifiestos (Deployments, Services, ConfigMaps, etc.) en una sola unidad
versionada llamada chart, parametrizable mediante values. El problema que
resuelve frente a aplicar manifiestos sueltos con `kubectl apply -f` es que,
sin Helm, cada cambio de ambiente (dev, prod) obliga a mantener copias casi
identicas de los mismos YAML con pequenas diferencias, lo que genera
desviaciones y errores dificiles de rastrear. Ademas, con manifiestos
sueltos no existe un concepto nativo de "version del despliegue completo": no
hay forma sencilla de revertir todos los cambios de una sola vez si algo
sale mal. Helm resuelve ambos problemas: los values permiten reutilizar las
mismas plantillas para distintos ambientes, y cada instalacion o
actualizacion queda registrada como una revision, lo que habilita
`helm rollback` a un estado anterior completo con un solo comando.

## 2. Diferencia entre chart, release y repository

Un chart es el paquete en si: la carpeta con `Chart.yaml`, `values.yaml` y
las plantillas que describen los recursos de Kubernetes. Un release es una
instalacion concreta de ese chart en un cluster, identificada por un nombre
(en esta practica, `sa-platform`); un mismo chart puede instalarse varias
veces en el mismo cluster (por ejemplo en distintos namespaces) generando
releases distintos, y cada `helm upgrade` sobre ese release crea una nueva
revision numerada. Un repository es simplemente un lugar donde se publican y
descargan charts (por ejemplo el repositorio de Bitnami usado para
`postgresql` y `rabbitmq` en este proyecto), analogo a un registro de paquetes
como npm o Maven Central pero para charts de Helm.

## 3. Que es un StatefulSet y cuando NO usarlo

Un StatefulSet es el controlador de Kubernetes disenado para aplicaciones
con estado que necesitan identidad de red estable, orden de creacion y
eliminacion predecible, y un volumen persistente propio por cada replica
(a diferencia de un Deployment, donde todas las replicas son intercambiables
y sin identidad fija). Por eso PostgreSQL se despliega como StatefulSet en
esta practica: cada pod mantiene el mismo nombre y el mismo
PersistentVolumeClaim aunque se reinicie. NO se debe usar un StatefulSet
para componentes sin estado que no necesitan identidad de red ni
almacenamiento propio, como los microservicios de esta practica
(auth-service, reserva-service, pago-service, notificacion-service,
api-gateway): estos se benefician mas de un Deployment porque pueden
escalar y reemplazarse libremente sin ningun requisito de orden o identidad,
que es exactamente lo que necesita el HPA para funcionar de forma agil.

## 4. Diferencia entre liveness, readiness y startup probe

La liveness probe responde a la pregunta "¿el proceso sigue vivo y
funcionando correctamente?"; si falla, Kubernetes reinicia el contenedor. La
readiness probe responde a "¿el pod esta listo para recibir trafico ahora
mismo?"; si falla, el pod se saca temporalmente de los endpoints del Service
sin reiniciarlo (por ejemplo, mientras la base de datos esta momentaneamente
lenta). La startup probe existe para aplicaciones con arranque lento: mientras
esta probe no pase, las otras dos (liveness y readiness) no se ejecutan, lo
que evita que Kubernetes mate un contenedor que simplemente todavia esta
inicializando (como pago-service, que tarda mas en arrancar por ser
Spring Boot).

## 5. Que es una NetworkPolicy y por que el trafico es permitido por defecto

Una NetworkPolicy es un recurso de Kubernetes que restringe el trafico de
red (ingress y/o egress) entre pods, basado en selectores de etiquetas. El
trafico es permitido por defecto porque el modelo de red de Kubernetes es
"flat" por diseno: cualquier pod puede alcanzar a cualquier otro pod del
cluster salvo que exista explicitamente una NetworkPolicy que lo restrinja.
Por eso en esta practica se aplico primero una politica de "deny all"
(bloquea todo el ingress por defecto) y luego se agregaron excepciones
puntuales: solo el gateway puede alcanzar a los microservicios, y solo los
microservicios y cronjobs autorizados pueden alcanzar a PostgreSQL y RabbitMQ.

## 6. Que es un PodDisruptionBudget

Un PodDisruptionBudget (PDB) define cuantas replicas de una aplicacion deben
mantenerse disponibles como minimo durante disrupciones voluntarias, como el
drenado de un nodo para mantenimiento o una actualizacion del cluster (no
protege contra fallas involuntarias como un crash). En esta practica cada
microservicio tiene un PDB con `minAvailable: 1`, lo que evita que
Kubernetes elimine todas las replicas de un microservicio al mismo tiempo
durante una operacion de mantenimiento planificada, preservando la
disponibilidad del servicio.

## 7. Que ventajas y que nuevos problemas introduce la comunicacion asincrona

Ventajas: el productor no queda bloqueado esperando que el consumidor
termine de procesar (pago-service retorna de inmediato tras publicar el
evento), lo que mejora la percepcion de velocidad para el cliente; ademas
desacopla los servicios en el tiempo, permitiendo que notificacion-service
este caido temporalmente sin que eso afecte el flujo de pago, ya que los
mensajes quedan durables en la cola hasta que el consumidor vuelve a estar
disponible. Problemas nuevos: aparece la necesidad de manejar consistencia
eventual en vez de consistencia inmediata (el usuario podria ver el pago
confirmado antes de que la notificacion se haya procesado); tambien se
introduce el riesgo de procesamiento duplicado si el consumidor confirma el
mensaje pero falla justo despues (por eso el commit del offset se hace solo
tras procesar exitosamente, nunca antes); y se anade complejidad operativa
real: ahora hay un componente de infraestructura adicional (el broker) que
monitorear, con sus propios temas de particionamiento, retencion y
durabilidad.

## 8. Que hace helm rollback internamente

`helm rollback` no "deshace" cambios de forma incremental: reinstala
completamente los manifiestos generados a partir de los values y la version
del chart guardados en una revision anterior (Helm guarda el estado
renderizado completo de cada revision, no solo un diff). Al ejecutar
`helm rollback sa-platform <n>`, Helm toma el manifiesto completo asociado a
la revision `n`, lo aplica sobre el cluster (creando una nueva revision, no
"regresando" el numero de revision) y actualiza el registro interno de
estado del release (el Secret de Helm en el namespace) para reflejar que
ahora la configuracion activa es la de esa revision anterior.
