# Documentación de uso de IA - Práctica 2

Este documento registra el uso de inteligencia artificial (Claude) durante el desarrollo de la Práctica 2: Autenticación y Autorización, junto con un análisis personal sobre su aplicación.

## Herramienta utilizada

Claude (Anthropic), a través de la interfaz de chat, usada principalmente como apoyo para organizar la implementación, acelerar la escritura de código sobre conceptos que ya conocía, y como segunda opinión en la depuración de un error puntual.

## Metodología de trabajo

El desarrollo se realizó de forma incremental, archivo por archivo. Los conceptos y la logica del proyecto (JWT, cookies HTTP-only, encriptacion AES, hash de contraseñas con bcrypt, arquitectura en capas) ya eran conocidos de antes y las decisiones tecnicas fueron propias. El uso de la IA se limito a confirmar que el codigo escrito estuviera correcto, apoyar en pruebas puntuales (como el diagnostico del error de la cookie) y ordenar la redaccion de la documentacion, no a definir ni construir el proyecto completo.

## Prompts principales utilizados

### 1. Análisis del enunciado

**Prompt:** Solicité el análisis del PDF de la Práctica 2 y el complemento con la transcripción de la clase, para tener ambas fuentes organizadas en un mismo lugar.

**Resultado:** Se confirmó una discrepancia entre el documento escrito y las indicaciones verbales del auxiliar: el requisito 9 (microservicio de autorización independiente) fue cancelado verbalmente en clase.

**Análisis personal:** Ya había escuchado en la clase que el auxiliar cancelaba ese punto, pero fue útil tener ambas fuentes (PDF y transcripción) confirmadas juntas por escrito para no depender solo de la memoria al momento de implementar.

### 2. Estructura del proyecto

**Prompt:** Pedí mantener la misma arquitectura en capas usada en la Práctica 1 (models, repositories, services, controllers) y agregar lo necesario para autenticación (middlewares, utils de JWT y encriptación).

**Resultado:** Se organizó la estructura de carpetas y se usó una columna adicional de hash SHA-256 (`correo_hash`) para permitir búsquedas sobre el campo de correo, que se guarda encriptado con AES.

**Análisis personal:** El problema de no poder buscar directamente sobre un campo encriptado con IV aleatorio ya lo tenía presente por trabajo previo con AES; usar un hash aparte para la búsqueda es la solución estándar y la que ya tenía en mente aplicar.

### 3. Implementación de JWT con renovación automática

**Prompt:** Pedí apoyo para escribir la lógica de verificación del token con ventana de gracia, con dos funciones separadas para distinguir "token válido" de "token vencido pero renovable".

**Resultado:** Middleware que intenta la verificación normal primero, y si falla, intenta la verificación con gracia antes de rechazar la petición.

**Análisis personal:** El concepto de ventana de gracia para renovación de tokens ya lo conocía; el apoyo de la IA aquí fue principalmente para escribir el código de forma ordenada y más rápido.

### 4. Depuración de un error real: `maxAge` de la cookie

**Situación:** Durante las pruebas, la renovación automática no funcionaba — el servidor respondía "No hay sesión activa" en vez de renovar el token.

**Prompt:** Compartí el resultado de las pruebas fallidas para diagnosticar el problema en conjunto.

**Resultado:** Se identificó que el `maxAge` de la cookie estaba igualado al tiempo de vida del JWT, por lo que el navegador eliminaba la cookie exactamente cuando el token expiraba, sin darle oportunidad al servidor de aplicar la lógica de renovación por gracia. La corrección fue extender el `maxAge` a la suma del tiempo de vida más el tiempo de gracia.

**Análisis personal:** Este fue el punto donde más valió la pena tener una segunda revisión: el error no estaba en la lógica del JWT en sí, sino en un detalle de configuración de la cookie que es fácil pasar por alto durante las pruebas. Quedó claro que la expiración del JWT (contenido del token) y el `maxAge` de la cookie (cuánto tiempo la guarda el navegador) son dos cosas independientes que hay que sincronizar a propósito.

### 5. Frontend para pruebas visuales de autorización

**Prompt:** Pedí una página de confirmación con botones para probar en vivo las rutas protegidas, en vez de una página estática simple.

**Resultado:** Página con dos botones que hacen `fetch` a las rutas protegidas y muestran el resultado en pantalla.

**Análisis personal:** Esto sí lo veo como un valor agregado real para la calificación oral, ya que permite demostrar la autorización por rol sin salir del navegador ni depender de Postman.

## Reflexión general sobre el uso de IA en esta práctica

El uso de IA en esta práctica fue puntual: la mayoría de las decisiones técnicas (elección de librerías, manejo de JWT, encriptación, arquitectura en capas) partieron de conocimiento previo. El apoyo de la IA se concentró en mantener el desarrollo ordenado, redactar la documentación técnica, y en la resolución del error de configuración de la cookie, que sí fue un caso concreto de depuración asistida.

## Nota de honestidad académica

Todo el código fue revisado, probado y comprendido antes de ser incluido en el repositorio. Las pruebas de funcionamiento (registro, login, renovación de token, autorización por rol, y verificación de encriptación en base de datos) fueron ejecutadas y validadas manualmente durante el desarrollo.

