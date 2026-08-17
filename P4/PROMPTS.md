# PROMPTS.md

Este documento describe el uso que se le dio a la inteligencia artificial
durante el desarrollo de la Practica 4.

La IA se utilizo de forma puntual, principalmente para:

- Confirmar decisiones de diseno antes de implementarlas, como la separacion
  de responsabilidades entre microservicios y la eleccion de la base de datos
  independiente por servicio.
- Generar el andamiaje repetitivo de codigo (estructura de carpetas,
  configuracion de TypeScript, configuracion de Docker) para poder enfocar el
  tiempo en las decisiones de arquitectura y en entender cada pieza del
  sistema.
- Revisar y confirmar que la implementacion de cada principio SOLID en el
  codigo correspondiera realmente a lo que se explica en el README, en lugar
  de copiar una explicacion generica.
- Probar y depurar la comunicacion entre el API Gateway y los microservicios.

No se utilizo la IA como reemplazo del entendimiento del sistema: cada
decision de arquitectura (numero de microservicios, lenguajes, separacion de
bases de datos, donde va GraphQL) fue discutida y confirmada antes de generar
cualquier archivo.
