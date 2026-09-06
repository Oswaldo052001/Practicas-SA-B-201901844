# Explicacion tecnica del flujo CI/CD - Practica 7

## Resumen

El workflow `.github/workflows/p7-cicd.yml` implementa un pipeline de dos
velocidades sobre el mismo sistema de microservicios CineTix (Practicas
4-6): **CI** (build + test) en cada push/PR, y **CI+CD completo**
(adicionalmente Docker + deploy a GKE) solo cuando se empuja un tag
`p7-v*`. Ver `01-diagrama-pipeline.md` para el diagrama.

## Disparadores (`on:`)

```yaml
on:
  push:
    branches: ["**"]
    tags: ["p7-v*"]
  pull_request:
    branches: ["**"]
  workflow_dispatch: {}
```

- `push` a cualquier rama y `pull_request`: cubren el flujo normal de
  desarrollo (feature branches, PRs hacia `develop`/`main`).
- `push` de un tag `p7-v*`: es el disparador especifico de despliegue.
- `workflow_dispatch`: permite correr el pipeline a mano desde la pestana
  Actions (util para tomar capturas sin esperar un commit real).

## Job `test-node` (CI)

Corre en **matrix** sobre los 6 microservicios en Node/TypeScript
(`api-gateway`, `auth-service`, `reserva-service`, `notificacion-service`,
`cronjob-registro`, `cronjob-resumen`), cada uno en su propio job paralelo
con `working-directory: P5/src/<servicio>`:

1. `actions/setup-node@v4` con cache de `npm` (usa el `package-lock.json`
   de cada servicio como clave de cache, para que las corridas siguientes
   sean mas rapidas).
2. `npm ci`: instalacion reproducible a partir del lockfile.
3. `npm run build --if-present`: compila TypeScript a `dist/` en los 4
   servicios que tienen ese script; los 2 `cronjob-*` (JavaScript plano)
   no lo tienen y el `--if-present` evita que el job falle por eso.
4. `npm test --if-present`: corre las pruebas Jest agregadas en esta
   practica (ver `README.md` de esta carpeta para el detalle de que prueba
   cada una).

`fail-fast: false` para que, si un servicio falla, los demas sigan
corriendo y se vea el estado real de los 6 en la misma corrida.

## Job `test-java` (CI)

`pago-service` no entra en la matrix de Node porque es Java/Spring Boot.
Usa `actions/setup-java@v4` (Temurin 17, igual que `<java.version>` del
`pom.xml`) con cache de Maven, y corre `mvn -B test`, que en Maven ya
incluye compilar (`compile`, `test-compile`) antes de ejecutar las pruebas
JUnit 5 + Mockito.

## Job `docker-build-push` (CD, solo en tags)

`needs: [test-node, test-java]` y `if: startsWith(github.ref,
'refs/tags/p7-v')`: solo corre si los dos jobs de CI pasaron **y** el push
que disparo el workflow fue de un tag con ese prefijo.

En matrix sobre los 7 servicios (los 6 de Node mas `pago-service`), cada
uno hace:

1. `docker/login-action@v3` contra `ghcr.io`, autenticado con
   `secrets.GITHUB_TOKEN` (el token automatico que GitHub inyecta en cada
   corrida, con permiso `packages: write` declarado en el job): no hace
   falta crear ni guardar ninguna credencial de Docker Hub.
2. `docker/build-push-action@v6` construye la imagen con el mismo
   `Dockerfile` multi-stage de la Practica 5 (contexto `P5/`, archivo
   `P5/docker/<servicio>/Dockerfile`, sin cambios) y la publica con dos
   tags: el nombre del tag de git (`github.ref_name`, ej. `p7-v1.0.0`) y
   `latest`.
3. Cache de capas de Docker con `type=gha` (cache nativo de GitHub
   Actions) para que las corridas siguientes no vuelvan a bajar/instalar
   todas las dependencias desde cero.

## Job `deploy` (CD, solo en tags)

`needs: docker-build-push`, mismo `if` de tag. Pasos:

1. `google-github-actions/auth@v2` con el secreto `GCP_SA_KEY` (JSON de
   una cuenta de servicio con `roles/container.developer`).
2. `google-github-actions/get-gke-credentials@v2` obtiene el `kubeconfig`
   del cluster `sa-p6-cluster` (namespace `sa-p6`), el mismo que se creo a
   mano en la Practica 6.
3. `helm dependency update` sobre `P5/charts/sa-platform` (resuelve los
   subcharts de Bitnami `postgresql` y `nats`, igual que en P6).
4. `helm upgrade sa-platform ... --reuse-values --set
   <servicio>.image.repository=... --set <servicio>.image.tag=...` por
   los 7 servicios: **no** se vuelve a pasar `values-secrets-gke.yaml`
   (ese archivo nunca se sube a git ni a GitHub Actions) ni el resto de
   `-f` que se uso en el `helm install` original de P6. `--reuse-values`
   le dice a Helm que tome como base los valores del release ya
   desplegado (que si tiene los secrets) y solo sobreescriba lo que se
   pasa explicitamente con `--set`: el repositorio y el tag de cada
   imagen. Asi el pipeline puede actualizar versiones sin que ningun
   secreto de la aplicacion pase por los logs de GitHub Actions.
5. `--wait --timeout 10m`: el job no se marca exitoso hasta que Kubernetes
   confirme que los pods nuevos estan `Ready` (o falla si se agota el
   tiempo), y un paso final corre `kubectl rollout status` sobre todos los
   deployments como verificacion explicita.

## Seguridad y buenas practicas aplicadas

- Ningun secreto de la aplicacion (password de Postgres, de NATS, JWT
  secret) pasa por GitHub Actions: solo viven en
  `P6/charts/values-secrets-gke.yaml`, que esta en `.gitignore` y ya esta
  aplicado al release desde que se instalo a mano en la Practica 6.
- El unico secreto que si vive en GitHub (`GCP_SA_KEY`) tiene el privilegio
  minimo necesario para desplegar (`roles/container.developer`), no acceso
  de administrador del proyecto.
- `permissions: contents: read` a nivel de workflow (principio de menor
  privilegio); el job de Docker eleva puntualmente a `packages: write`
  solo donde se necesita.
- Las imagenes nunca usan el tag `latest` para el despliegue real (aunque
  se publica por conveniencia): el `deploy` siempre fija el tag exacto del
  release de git (`github.ref_name`), para que el despliegue sea
  reproducible y auditable (se sabe exactamente que commit corresponde a
  cada imagen corriendo en el cluster).

## Rollback

Si un despliegue sale mal, `helm rollback sa-platform <REVISION> -n sa-p6`
regresa el release a la revision anterior (Helm guarda el historial de
revisiones automaticamente en cada `helm upgrade`). No forma parte del
pipeline automatizado en esta practica, pero es el mecanismo natural dado
que ya se usa Helm para el despliegue.
