# Preguntas teoricas - preparacion (Practica 7)

El enunciado (`0780_Practica_7_2S2026.pdf`) no trae, a diferencia de
practicas anteriores, una lista numerada de preguntas obligatorias para
esta seccion (solo dice, en el criterio 1.4: "Analiza e interioriza
conceptos clave sobre CI/CD y DevOps de forma concisa"). Esta es una
preparacion anticipada con base en los temas que el auxiliar realmente
cubrio en la clase de esta semana (testing en DevOps), por si las pregunta
de forma oral durante la calificacion. Si el auxiliar publica una lista
oficial, hay que reemplazar/completar esto con esas preguntas exactas.

## 1. Diferencia entre Integracion Continua (CI) y Despliegue Continuo (CD)

CI es automatizar la integracion, build y prueba de cada cambio de codigo
tan pronto se sube (en este pipeline: los jobs `test-node`/`test-java` en
cada push/PR). CD es automatizar que ese cambio, ya validado, llegue a un
entorno real sin intervencion manual (aqui: los jobs `docker-build-push` y
`deploy`, que solo corren cuando se etiqueta una version con `p7-v*`).

## 2. Por que "shift left testing" y como se aplico en esta practica

Shift left es mover las pruebas lo mas temprano posible en el ciclo de
vida, en vez de dejarlas para el final (donde un defecto es mucho mas caro
de corregir). En esta practica, 4 de los 6 servicios en Node no tenian
ninguna logica separada de su infraestructura (Express, NATS, Postgres):
se extrajo la parte pura (`routing.ts`, `formato.ts`, `fecha.js`,
`mapear.js`) a modulos aparte, justamente para poder escribirles pruebas
unitarias rapidas que corren en cada commit, en vez de depender solo de
probar manualmente el sistema desplegado.

## 3. Piramide de pruebas: donde caen las pruebas de este pipeline

Las 7 suites agregadas (Jest x6 + JUnit/Mockito) son todas **pruebas
unitarias**: la base ancha y rapida de la piramide (mockeando
repositorios, el broker NATS y el proveedor de pago). El pipeline no
agrega pruebas de integracion ni end-to-end en esta practica (eso quedaria
para una fase posterior, corriendo contra el ambiente de staging).

## 4. Por que el pipeline separa CI (cualquier push) de CD (solo tags)

Porque no todo commit deberia llegar a produccion automaticamente: CI da
feedback rapido sobre si el codigo compila y las pruebas pasan en *cada*
cambio, mientras que el despliegue se reserva para un tag explicito
(`p7-v1.0.0`, etc.), que representa una decision deliberada de "esta
version esta lista para desplegarse". Esto tambien es lo que pide la
rubrica en el criterio de Versionamiento.

## 5. Que es un Quality Gate y si este pipeline tiene uno

Un quality gate es un conjunto de condiciones que el codigo debe cumplir
para poder avanzar en el pipeline (por ejemplo, en SonarQube: cobertura
minima, cero vulnerabilidades criticas). Este pipeline tiene un quality
gate implicito y binario: si `test-node` o `test-java` fallan, los jobs de
Docker y deploy nunca se ejecutan (`needs:`), por lo que ningun codigo que
no pase sus pruebas llega a construirse como imagen ni a desplegarse. No
se integro una herramienta de analisis estatico (SonarQube/Snyk) en esta
practica; queda mencionado como siguiente paso natural (DevSecOps).

## 6. Por que `helm upgrade --reuse-values` en vez de `helm install` de cero

Porque el release `sa-platform` en el cluster GKE ya tiene aplicados los
secretos reales (password de Postgres, de NATS, JWT) desde que se instalo
a mano en la Practica 6, y esos secretos nunca deben pasar por GitHub
Actions. `--reuse-values` le dice a Helm que tome como base los valores ya
desplegados y solo sobreescriba lo que el pipeline pasa explicitamente
(`image.repository`/`image.tag` de cada servicio), sin necesidad de
repetir ni exponer el resto de la configuracion.

## 7. Diferencia entre este pipeline y una estrategia de despliegue tipo
   Blue-Green o Canary

Este pipeline hace un **rolling update** (el que ya usa el `Deployment` de
Kubernetes por defecto: reemplaza los pods viejos por los nuevos de forma
gradual, sin downtime, pero sin control fino sobre el porcentaje de
trafico). Canary libera la version nueva solo a un porcentaje pequeno de
usuarios primero y monitorea antes de continuar; Blue-Green mantiene dos
ambientes identicos y cambia el trafico de golpe, con posibilidad de
regresar instantaneamente. Ninguna de las dos se implemento aqui: quedaria
como una mejora futura usando, por ejemplo, un Service Mesh o un
controlador de despliegues progresivos.
