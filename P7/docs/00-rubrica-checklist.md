# Checklist de la rubrica - Practica 7

Mapa de cada punto del enunciado (`0780_Practica_7_2S2026.pdf`) a donde
esta cubierto en el repositorio, y que queda pendiente de que Oswaldo lo
corra/verifique en su maquina (esta sesion de trabajo no tiene Kubernetes,
GCP, Docker Desktop ni Maven disponibles).

## 8.1 Requisitos para optar a la calificacion

| Requisito | Cubierto en | Estado |
|---|---|---|
| Practica 5 y 6 calificadas previamente | (fuera del alcance de esta carpeta) | Asumido: ya entregadas |
| Dockerizacion automatica (build + push) | `.github/workflows/p7-cicd.yml`, job `docker-build-push` | Listo, falta correr en GitHub |
| Pipeline funcional (Actions termina sin errores) | mismo workflow | Falta correr y confirmar en verde |
| Documentacion obligatoria | esta carpeta `P7/docs/` | Listo |

## 8.2 Detalle de la calificacion

### 1. Habilidades (40 pts)

| # | Criterio | Pts | Donde esta |
|---|---|---|---|
| 1.1 | Documentacion tecnica | 10 | `docs/02-explicacion-flujo.md` |
| 1.2 | Diagrama del pipeline (4 fases + interacciones) | 10 | `docs/01-diagrama-pipeline.md` |
| 1.3 | Organizacion del repositorio (`/P7` + `.github/workflows`) | 5 | Carpeta `P7/` en la raiz del repo + workflow en `.github/workflows/p7-cicd.yml` |
| 1.4 | Preguntas teoricas | 15 | `docs/04-preguntas-teoricas.md` (el enunciado no trae una lista oficial, ver nota abajo) |

### 2. Conocimiento (60 pts)

| # | Criterio | Pts | Donde esta |
|---|---|---|---|
| 2.1 | Pipeline CI/CD (build + test en cada commit/PR) | 20 | Jobs `test-node` (matrix 6 servicios) y `test-java` |
| 2.2 | Automatizacion Docker (build + push) | 15 | Job `docker-build-push` (matrix 7 servicios, GHCR) |
| 2.3 | Deploy automatico a K8s | 15 | Job `deploy` (helm upgrade contra GKE) |
| 2.4 | Versionamiento (tags/branches/releases disparando las acciones) | 10 | Push a cualquier rama o PR -> solo CI. Push de un tag `p7-v*` -> CI + build/push de imagenes + deploy |

### Nota sobre "Preguntas teoricas" (1.4)

El PDF del enunciado no trae, a diferencia de practicas anteriores, una
lista numerada de preguntas obligatorias: la seccion 8 (Detalle de la
calificacion) solo dice "Analiza e interioriza conceptos clave sobre CI/CD
y DevOps de forma concisa". Es probable que el auxiliar las pregunte de
forma oral durante la calificacion (10-12 de septiembre), como paso con el
"regano" del segundo parcial que menciono en la grabacion de esta semana.
`docs/04-preguntas-teoricas.md` prepara respuestas cortas a los conceptos
mas relevantes de la clase de esta semana (continuous testing, piramide de
pruebas, shift left/right, QA vs QC vs testing, quality gates, flaky
tests, deployment strategies) para tenerlas listas si te las piden.

## Pendientes que solo se pueden hacer desde tu maquina/cuenta

- [ ] Confirmar que el cluster GKE `sa-p6-cluster` (namespace `sa-p6`,
      release Helm `sa-platform`) sigue existiendo, o recrearlo con los
      pasos 1-8 de `P6/scripts/desplegar-gke.ps1` si ya lo eliminaste.
- [ ] Correr `cd P5/src/pago-service && mvn test` una vez en tu maquina
      (esta sesion no tenia Maven instalado) para confirmar que
      `PagoServiceTest` y `ProveedorPagoSimuladoTest` compilan y pasan.
- [ ] Crear la cuenta de servicio de GCP y agregar el secreto
      `GCP_SA_KEY` en GitHub (ver `P7/README.md`, seccion "Antes de correr
      el pipeline").
- [ ] Hacer push del repositorio (con `P5`, `P6` y `P7` ya actualizados) a
      GitHub si todavia no esta.
- [ ] Disparar el pipeline: push normal para ver el CI en verde, y luego
      `git tag p7-v1.0.0 && git push origin p7-v1.0.0` para el CI+CD
      completo.
- [ ] Cambiar la visibilidad de los 7 paquetes GHCR a Public despues del
      primer push (ver `docs/03-registro-contenedores.md`), o configurar
      el `imagePullSecret` si prefieres mantenerlos privados.
- [ ] Tomar las capturas de `docs/05-evidencias.md`.
- [ ] Correr `P6/scripts/eliminar-recursos.ps1` despues de la calificacion
      (12 de septiembre) para no seguir generando costo en GCP.
