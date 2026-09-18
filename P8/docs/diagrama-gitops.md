# Diagrama del flujo GitOps (criterio 1.2)

Universidad San Carlos de Guatemala, Software Avanzado, Seccion B, carne
201901844. Flujo completo desde el commit hasta el cluster, marcando los
puntos de validacion (que pueden detener el flujo) y el punto de reversion
automatica.

```mermaid
flowchart TD
    A["Dev: git push --tags\n(repo codigo)"] --> B["GitHub Actions: build + test"]
    B --> C{"Trivy scan\n(CVEs CRITICAL)"}
    C -- "vulnerabilidad critica" --> C1["Pipeline FALLA\nimagen nunca se publica"]
    C -- "OK / justificado en .trivyignore" --> D["Build & push imagen a GHCR"]
    D --> E["SBOM (Syft)"]
    E --> F["Cosign sign (keyless, OIDC)"]
    F --> G["PR automatico al repo GitOps\n(actualiza values-images.yaml)"]
    G --> H["Merge del PR"]
    H --> I["ArgoCD detecta el cambio\n(polling / webhook)"]
    I --> J{"Kyverno admission\n(disallow-latest-tag, Enforce)"}
    J -- "viola politica" --> J1["Pod RECHAZADO\npor el admission webhook"]
    J -- "OK" --> K["Argo Rollouts: canary api-gateway"]
    K --> L["setWeight 25% -> AnalysisRun (k6 vs canary)"]
    L --> M{"Umbrales k6\n(p95<500ms, error<5%)"}
    M -- "Failed" --> M1["Rollout ABORTA\ntrafico vuelve 100% a stable\n(reversion automatica)"]
    M -- "Successful" --> N["pause 30s -> setWeight 50% -> AnalysisRun"]
    N --> O{"Umbrales k6"}
    O -- "Failed" --> M1
    O -- "Successful" --> P["pause 30s -> setWeight 75% -> AnalysisRun"]
    P --> Q{"Umbrales k6"}
    Q -- "Failed" --> M1
    Q -- "Successful" --> R["pause indefinido\npromocion manual/automatica a 100%"]

    style C1 fill:#f8d7da,stroke:#842029
    style J1 fill:#f8d7da,stroke:#842029
    style M1 fill:#fff3cd,stroke:#997404
    style R fill:#d1e7dd,stroke:#0f5132
```

## Puntos de validacion (pueden detener el flujo)

1. **Trivy (CVEs CRITICAL)** - en el pipeline de CI, antes de publicar la
   imagen. Si hay una CVE CRITICAL sin justificar en `.trivyignore`, el job
   falla y la imagen nunca llega a GHCR ni al repo GitOps.
2. **Kyverno admission (`disallow-latest-tag`, Enforce)** - en el cluster,
   al momento en que Kubernetes intenta crear el Pod. Rechaza cualquier Pod
   sin tag explicita o con `:latest`, sin importar que ArgoCD ya haya
   sincronizado el manifiesto.
3. **AnalysisRun (k6 contra `/ready-check` del canary)** - durante el
   rollout progresivo. Si el 95% de las peticiones no responde en <500ms o
   la tasa de error supera 5%, el `AnalysisRun` pasa a `Failed` y Argo
   Rollouts aborta el despliegue automaticamente, devolviendo el 100% del
   trafico a la version `stable` sin que nadie tenga que intervenir.

## Punto de reversion automatica

El nodo resaltado en amarillo (`M1`) es la reversion automatica exigida por
el criterio 2.4: ocurre completamente dentro del cluster, orquestada por
Argo Rollouts, sin que ArgoCD ni el pipeline de CI tengan que hacer nada
adicional. Evidencia y cronologia detallada en
[`informe-incidente.md`](informe-incidente.md).
