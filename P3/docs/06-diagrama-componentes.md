# Diagrama de componentes

Este diagrama muestra la relación entre los microservicios, el API Gateway y los
sistemas externos, incluyendo el tipo de comunicación entre cada par de
componentes.


![DiagramadeComponentes](/Imagenes/DiagramaComponentes.png)

## Notas sobre la comunicación representada

El API Gateway solo se comunica de forma síncrona, y solo con los servicios que
necesitan responderle algo al usuario en el momento: la verificación de identidad,
la carga de transacciones y las acciones del flujo de aprobación. El Gateway no
tiene ninguna conexión directa hacia integracion, notificacion ni auditoria,
porque esos tres servicios reaccionan a eventos, no a peticiones del usuario.

El broker de mensajería es el único canal por el que un microservicio se entera de
lo que hizo otro. Ningún microservicio llama directamente a otro microservicio.
