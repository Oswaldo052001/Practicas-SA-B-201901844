# Practica 8 - GitOps, Despliegues Progresivos y Seguridad en la Cadena de Suministro

Universidad San Carlos de Guatemala, Facultad de Ingenieria, Software
Avanzado, Seccion B, Segundo Semestre 2026. Estudiante: Oswaldo Antonio
Choc, carne 201901844.

## Que es esto

Cierra el ciclo de entrega continua iniciado en la Practica 7: en vez de que
el pipeline de GitHub Actions despliegue directamente al cluster (P6/P7), la
unica entidad que aplica cambios al cluster de Kubernetes (GKE) es
**ArgoCD**, leyendo el estado deseado desde un repositorio GitOps separado
(`Practicas-SA-B-201901844-gitops`). El pipeline de CI (este repo) se limita
a construir, probar, escanear (Trivy), firmar (Cosign) y generar SBOM de las
7 imagenes de `P5/src`, y luego abre un Pull Request en el repo GitOps
actualizando el tag de imagen. Al hacer merge de ese PR, ArgoCD sincroniza el
cambio al cluster automaticamente.

Ademas se agrega:

- **Despliegue progresivo (canary)** con Argo Rollouts para `api-gateway`,
  con analisis automatizado (k6 contra un Job de Kubernetes) entre cada
  incremento de trafico, y reversion automatica si el analisis falla.
- **Politicas de seguridad admission-time** con Kyverno (`ClusterPolicy`)
  que bloquean, entre otras cosas, el uso de la etiqueta `:latest`.
- **Cadena de suministro firmada**: cada imagen se firma con Cosign
  (keyless, OIDC de GitHub Actions) y se genera su SBOM (Syft) como parte
  del pipeline, antes de que exista un PR hacia GitOps.

No se reescribe la aplicacion: se reutiliza integramente el codigo de
`P5/src` y el chart de Helm de `P5/charts/sa-platform` (vendorizado en
`P8/charts/sa-platform`), con el overlay GKE ya usado en P6/P7. Lo que
agrega esta practica es el flujo GitOps, el canary con analisis, las
politicas y la firma/SBOM.

## Arquitectura del flujo GitOps

Ver diagrama completo en [`docs/diagrama-gitops.md`](docs/diagrama-gitops.md).

Resumen: `git push --tags` (este repo) -> GitHub Actions (build, test,
Trivy, SBOM, Cosign sign) -> PR automatico al repo GitOps actualizando
`values-images.yaml` -> merge -> ArgoCD detecta el cambio y sincroniza ->
Argo Rollouts ejecuta el canary de `api-gateway` con analisis k6 en cada
paso -> si el analisis falla, Argo Rollouts revierte automaticamente a la
version estable sin intervencion manual.

## Estructura

```
P8/
  README.md                        Este archivo
  docs/
    diagrama-gitops.md             Diagrama del flujo (criterio 1.2)
    informe-incidente.md           Informe del fallo inducido (criterio 1.3)
  terraform/                       Cluster GKE, namespace sa-p8, cuotas (heredado de P6)
  charts/sa-platform/              Chart de Helm vendorizado (values-p8.yaml, etc.)
  gitops-bootstrap/                Manifiesto de la Application de ArgoCD + script de bootstrap
  tests/k6/loadtest.js             Script de prueba de carga usado como AnalysisTemplate

Repo separado: Practicas-SA-B-201901844-gitops
  apps/sa-platform/
    Chart.yaml, values*.yaml       Fuente de verdad que lee ArgoCD
    templates/
      rollout.yaml                 Argo Rollouts: estrategia canary + analysis steps
      analysistemplate.yaml        AnalysisTemplate (Job de k6 contra /ready-check)
      k6-configmap.yaml            Script de k6 embebido como ConfigMap
      service-canary.yaml / service-stable.yaml   Servicios que Argo Rollouts enruta
    templates/policies/
      kyverno-policies.yaml        ClusterPolicy: disallow-latest-tag (Enforce), etc.
```

## Tabla de enlaces obligatoria (seccion 4.1 del enunciado)

| Elemento | Enlace / referencia |
|---|---|
| Repositorio GitOps | https://github.com/Oswaldo052001/Practicas-SA-B-201901844-gitops |
| Aplicacion en ArgoCD | `sa-platform` (namespace `argocd`), despliega al namespace `sa-p8` del cluster GKE |
| Ejecucion exitosa del pipeline | **TBD** - URL al Actions run verde (candidato: tag `p8-v1.0.7` una vez revertido el fallo inducido) |
| Reversion automatica | **TBD** - depende de confirmar `AnalysisRun` en `Failed` + Rollout revertido a stable (ver `docs/informe-incidente.md`) |
| Despliegue rechazado por politica | **TBD** - evidencia del rechazo de Kyverno (`kubectl run test-latest-tag --image=nginx:latest` -> denegado por `disallow-latest-tag`) |
| Bloqueo por vulnerabilidad critica | **TBD** - Actions run bloqueado por Trivy (candidatos: runs fallidos de `pago-service` en tags p8-v1.0.2 a p8-v1.0.4 por CVEs de Tomcat, o de `cronjob-registro` por CVE-2026-59873 de `tar`) |
| Imagen firmada (Cosign) | `ghcr.io/oswaldo052001/sa-p8/api-gateway:p8-v1.0.6` (firma keyless verificable con `cosign verify`) |
| Reporte de prueba de carga | [`tests/k6/loadtest.js`](tests/k6/loadtest.js) - mismo script usado en el `AnalysisTemplate` del canary |
| Video demostrativo | **TBD** - pendiente de grabar (5-8 min) |

> Nota: el pipeline de este proyecto bloquea sobre **push de tag** (no sobre
> Pull Request), ya que asi se diseno desde la Practica 7 para separar
> "trabajo en progreso" (ramas/PRs normales) de "listo para desplegar"
> (tags `pX-vX.Y.Z`). El bloqueo por vulnerabilidad critica y el escaneo de
> Trivy ocurren en ese mismo punto del pipeline, antes de que se abra el PR
> hacia el repo GitOps - el efecto (una imagen vulnerable nunca llega a
> GitOps) es el que pide el enunciado.

## Fallo inducido y reversion automatica (criterio 2.4)

Se modifico deliberadamente el endpoint `/ready-check` de `api-gateway`
(distinto de `/health`, que se dejo intacto para no romper el liveness/
readiness probe de Kubernetes) para que responda `500` de forma
permanente, en el tag `p8-v1.0.6`. El `AnalysisTemplate` del canary corre
el script de k6 contra ese endpoint en cada paso de `setWeight`; al fallar
los umbrales (`http_req_failed rate<0.05`), el Job de k6 termina con
codigo distinto de cero, lo que Argo Rollouts interpreta como metrica
`Failed`, abortando el rollout y devolviendo el 100% del trafico a la
version estable sin intervencion manual. Detalle completo, tiempos y
evidencia en [`docs/informe-incidente.md`](docs/informe-incidente.md).

## Politicas de Kyverno

Tres `ClusterPolicy`: `disallow-latest-tag` (**Enforce** - bloquea
activamente cualquier Pod con tag `:latest` o sin tag), y
`require-resource-limits` / `require-run-as-nonroot` (**Audit** - se
dejaron en modo reporte para no arriesgar romper los subcharts de terceros,
postgresql y nats, antes de la entrega; quedan documentadas como mejora
futura pasarlas a Enforce). `disallow-latest-tag` se probo en vivo:

```
kubectl run test-latest-tag --image=nginx:latest -n sa-p8 --restart=Never
Error from server: admission webhook "validate.kyverno.svc-fail" denied the request:
policy Pod/sa-p8/test-latest-tag for resource violation:
disallow-latest-tag:
  require-image-tag: 'validation error: usar la etiqueta ":latest" no esta permitido...'
```
