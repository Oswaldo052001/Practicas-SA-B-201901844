# Preguntas teoricas - Practica 6

> Nota: estas respuestas estan desarrolladas a partir de lo implementado en
> esta practica y de lo visto en clase. La rubrica pide explicitamente
> respuestas "completas, analiticas y con propias palabras" (20 pts, el
> criterio de mayor peso de toda la practica) - conviene leerlas, entenderlas
> y reescribirlas con las propias palabras antes de entregar, no copiarlas
> tal cual.

## 1. ¿Que es un cluster de Kubernetes administrado y que diferencias tiene frente a uno local?

Un cluster administrado (GKE, EKS, AKS, DOKS, etc.) es un cluster de
Kubernetes donde el **plano de control** (el `kube-apiserver`, `etcd`, el
scheduler y el controller manager) lo opera, actualiza, respalda y hace
altamente disponible el propio proveedor de nube, no el estudiante. Lo unico
que el estudiante administra directamente son los **nodos worker** (o ni
siquiera eso, en modelos serverless como GKE Autopilot) y todo lo que corre
dentro del cluster (Deployments, Services, etc.).

Frente a un cluster local (minikube, kind, k3s corriendo en la propia
maquina), las diferencias que se comprobaron en esta practica fueron:

- **Direccion publica real**: en local, `api-gateway` solo se podia alcanzar
  con un `NodePort` sobre `localhost` o con `kubectl port-forward`; en GKE,
  el mismo `Service` (cambiando el tipo a `LoadBalancer`) obtiene una IP
  publica real, provisionada por un Load Balancer del proveedor, alcanzable
  desde cualquier lugar de internet.
- **Almacenamiento**: en local el volumen persistente vive en el disco de la
  propia laptop (y se pierde si se borra el cluster de minikube); en GKE, el
  `PersistentVolumeClaim` provisiona un disco persistente real de Google
  Cloud a traves de una `StorageClass` (`standard-rwo`), con la
  disponibilidad y durabilidad que ofrece el proveedor.
- **Identidades y permisos**: en local no hay ningun control de acceso mas
  alla de la propia maquina; en la nube existe IAM del proveedor, cuentas de
  servicio, y el cluster necesita permisos explicitos para poder hacer
  `pull` de imagenes del registro de contenedores.
- **Costos**: un cluster local no cuesta nada mas que los recursos de la
  propia maquina; un cluster administrado factura por hora mientras esta
  activo (nodos, cuota de gestion del cluster, discos, balanceador), por eso
  esta practica insiste en eliminar todo al terminar.
- **Escala real de los nodos**: en local, el "nodo" es literalmente la
  misma maquina donde se desarrolla (recursos compartidos con el IDE, el
  navegador, etc.); en GKE cada nodo es una VM dedicada con la capacidad que
  se eligio explicitamente (`e2-medium`, 2 vCPU / 4 GB en este caso).

## 2. ¿Que es un Service de tipo LoadBalancer y como lo implementa el proveedor de nube?

Un `Service` de tipo `LoadBalancer` es la forma que tiene Kubernetes de
pedirle, de manera declarativa, a la infraestructura donde corre el cluster
que provisione un balanceador de carga externo y le asigne una direccion IP
publica que reenvie el trafico hacia los pods que hacen match con el
`selector` del Service (en este caso, los pods de `api-gateway`).

Kubernetes por si solo no crea ese balanceador: delega esa parte a un
**cloud-controller-manager** especifico del proveedor. En GKE, al crear un
Service `type: LoadBalancer`, el controlador de Google detecta ese recurso y
automaticamente aprovisiona un **Network Load Balancer de Google Cloud**
(capa 4, TCP/UDP), le reserva una IP publica externa, y programa las reglas
de reenvio (`forwarding rule`) hacia los nodos del cluster que tienen pods
del Service corriendo (usando `kube-proxy`/iptables o GKE Dataplane V2 para
el ultimo salto dentro del nodo). Esa IP queda visible en
`kubectl get svc api-gateway -n sa-p6` bajo la columna `EXTERNAL-IP`.

La alternativa que menciona el enunciado, un `Ingress`, trabaja a nivel de
capa 7 (HTTP/HTTPS) y permite enrutar por dominio o path hacia varios
Services distintos detras de una sola IP; en esta practica se eligio
`LoadBalancer` directo sobre `api-gateway` porque ese servicio ya es, el, el
unico punto de entrada de toda la plataforma (el resto de microservicios ni
siquiera son alcanzables desde fuera del cluster), por lo que un `Ingress`
adicional no aportaria enrutamiento nuevo, solo una capa extra.

## 3. ¿Que es un registro de contenedores y por que es necesario para desplegar en la nube?

Un registro de contenedores es un servicio que almacena y distribuye
imagenes de Docker (u OCI en general), identificadas por nombre y tag,
permitiendo publicarlas (`docker push`) y descargarlas (`docker pull` o, en
este caso, el propio `kubelet` de cada nodo haciendolo automaticamente al
crear un pod).

Es necesario para desplegar en la nube porque los nodos del cluster de GKE
son maquinas distintas a la laptop donde se construyeron las imagenes con
`docker build`: esas imagenes solo existen en el disco local del estudiante
hasta que se **publican** en algun lugar accesible por los nodos del
cluster. Sin un registro, Kubernetes no tendria de donde descargar la
imagen indicada en cada `Deployment`/`CronJob`, y los pods quedarian en
`ErrImagePull`/`ImagePullBackOff`. En esta practica se uso **Artifact
Registry** (ver `03-registro-contenedores.md`), publicando las 7 imagenes
como privadas.

## 4. ¿Que componentes del cluster administra el proveedor y cuales siguen siendo responsabilidad del estudiante?

**Administra Google (GKE):**

- El plano de control completo: `kube-apiserver`, `etcd`, scheduler,
  controller manager (alta disponibilidad, parches de seguridad,
  actualizaciones de version de Kubernetes).
- El aprovisionamiento fisico de los nodos worker que se pidieron (las VMs
  subyacentes, el hipervisor, la red fisica del datacenter).
- El disco persistente real detras de cada `PersistentVolume` creado por la
  `StorageClass` `standard-rwo` (redundancia, durabilidad).
- El Load Balancer de red detras de cada Service `LoadBalancer` (la IP
  publica, el enrutamiento hacia los nodos).
- El registro de contenedores (Artifact Registry): almacenamiento,
  replicacion, y la integracion de permisos con el cluster.

**Sigue siendo responsabilidad del estudiante:**

- Todo lo que corre **dentro** del cluster: los Deployments, Services,
  ConfigMaps, Secrets, HPA, PodDisruptionBudgets y NetworkPolicies del chart
  de Helm (la definicion completa de la aplicacion).
- El contenido y la seguridad de las imagenes que se construyen y publican
  (que no tengan vulnerabilidades conocidas, que no corran como root, etc.).
- La gestion de credenciales: que password va en cada Secret, que no queden
  versionadas en el repositorio (`values-secrets-gke.yaml` esta en
  `.gitignore`).
- El dimensionamiento de recursos (`requests`/`limits` de CPU y memoria,
  cuantos nodos y de que tipo), que es lo que determina directamente el
  costo.
- Apagar/eliminar los recursos cuando ya no se necesitan: GKE no borra nada
  automaticamente, el cluster sigue facturando mientras el estudiante no lo
  elimine.

## 5. ¿Que costos genera el despliegue realizado y como podrian reducirse?

Ver el detalle completo con montos en `05-costos.md`. En resumen: los costos
vienen de los nodos del cluster (cobrados por hora mientras estan
encendidos), la cuota de gestion del cluster de GKE Standard, los discos
persistentes de PostgreSQL y NATS, y el Load Balancer publico del gateway.
Se redujeron manteniendo el numero minimo de nodos que exige la rubrica (2),
usando un tipo de maquina modesto pero suficiente (`e2-medium`), discos
pequenos, un unico namespace/entorno, y sobre todo **no dejando el cluster
corriendo**: se levanta solo para tomar evidencia o presentar, y se elimina
de inmediato despues con `scripts/eliminar-recursos.ps1`.
