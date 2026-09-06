# Diagrama del pipeline - Practica 7

## Vision general (4+ fases exigidas por el enunciado)

```mermaid
flowchart TD
    A[Push / Pull Request<br/>cualquier rama] --> B
    T[Push de tag p7-v*.*.*] --> B

    subgraph CI["CI - siempre que hay push o PR"]
        B[Build<br/>npm ci / mvn -B] --> C[Test<br/>jest x6 + JUnit/Mockito]
    end

    C --> D{"¿El push fue\nun tag p7-v*?"}
    D -- No --> Z[Fin: solo feedback de CI]

    subgraph CD["CD - solo si el push fue un tag p7-v*"]
        D -- Si --> E["Dockerize<br/>docker build (7 servicios)"]
        E --> F["Push a GHCR<br/>ghcr.io/OWNER/sa-p7/&lt;servicio&gt;:&lt;tag&gt;"]
        F --> G["Deploy<br/>helm upgrade --reuse-values"]
        G --> H["Verificacion<br/>kubectl rollout status"]
    end

    H --> I[(Cluster GKE\nsa-p6-cluster\nnamespace sa-p6)]

    style CI fill:#eef6ff,stroke:#4a90d9
    style CD fill:#eefbea,stroke:#4aa04a
```

## Las 4 fases pedidas explicitamente (seccion 3.2 del enunciado)

1. **Build**: `npm ci` + `npm run build` (TypeScript -> `dist/`) para los 4
   servicios TS, y `mvn -B test` (que en Maven incluye la fase `compile`)
   para `pago-service`. Corre en cada push/PR, en paralelo por servicio
   (matrix de GitHub Actions).
2. **Test**: `npm test` (Jest) en los 6 servicios Node y JUnit 5 + Mockito
   en `pago-service`. Todas las pruebas son unitarias, aisladas y rapidas
   (base de la piramide de pruebas vista en la clase de esta semana): no
   requieren Postgres, NATS ni Kubernetes reales.
3. **Dockerize**: `docker/build-push-action` construye las 7 imagenes con
   los mismos `Dockerfile` multi-stage de la Practica 5
   (`P5/docker/<servicio>/Dockerfile`), usando `P5/` como contexto de
   build (igual que hacia `desplegar-gke.ps1` en la Practica 6).
4. **Deploy**: `helm upgrade --reuse-values` actualiza unicamente el
   `image.repository`/`image.tag` de los 7 subcharts en el release
   `sa-platform` que ya esta corriendo en GKE, y espera (`--wait`) a que
   el rollout termine antes de dar el job por exitoso.

## Por que el deploy solo corre en tags

La rubrica (2.4, "Versionamiento") pide que las etiquetas, ramas o
releases disparen las acciones correctamente. Aqui:

- Cualquier commit en cualquier rama, o un Pull Request, dispara **solo**
  el CI (build + test): retroalimentacion rapida sin tocar produccion.
- Solo un **tag** con el formato `p7-vX.Y.Z` (por ejemplo `p7-v1.0.0`)
  dispara adicionalmente el build/push de imagenes y el despliegue: el tag
  representa una version concreta y deliberada que se decide promover, no
  cada commit intermedio.
