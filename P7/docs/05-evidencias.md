# Evidencias requeridas - Practica 7

Plantilla de capturas a tomar despues de correr el pipeline con exito
(entregable "Evidencia de ejecucion: Capturas del pipeline exitoso desde
la interfaz de Actions").

## 1. CI en un push/PR normal

- [ ] Pestana **Actions** del repositorio, mostrando una corrida disparada
      por push/PR con los jobs `test-node` (los 6 servicios en verde) y
      `test-java` en verde, y los jobs de Docker/deploy **no ejecutados**
      (gris/omitidos), para evidenciar que el CD solo corre en tags.

## 2. CI + CD completo (al empujar un tag `p7-v*`)

- [ ] Vista general del workflow con los 4 jobs (`test-node`, `test-java`,
      `docker-build-push`, `deploy`) en verde.
- [ ] Log expandido de un job `docker-build-push` (cualquier servicio)
      mostrando el build y el push exitoso a `ghcr.io`.
- [ ] Log del job `deploy` mostrando la creacion del cluster `kind`, el
      `helm install` exitoso y la salida de `kubectl rollout status` /
      `kubectl get pods`.

## 3. Registro de contenedores

- [ ] Pagina de paquetes de GitHub (`https://github.com/users/<usuario>/packages`)
      mostrando los 7 paquetes `sa-p7/<servicio>` publicados.

## 4. Cluster despues del despliegue

Nota: desde el cambio de alcance indicado por el auxiliar, el despliegue ya
no es a GKE sino a un cluster "kind" efimero creado dentro del propio job
de GitHub Actions (namespace `sa-p7`). Esta evidencia se toma del log del
paso "Verificacion post-despliegue" del job `deploy` (no hay cluster que
consultar despues, porque se destruye junto con el runner al terminar el
job).

- [ ] Log del paso "Verificacion post-despliegue": `kubectl get pods -n
      sa-p7 -o wide` (todos `Running`, imagenes con el tag nuevo) y el
      `kubectl rollout status` de cada deployment en `Success`.

## 5. Diagrama del pipeline

- [ ] Captura o export del diagrama Mermaid de `01-diagrama-pipeline.md`
      (se puede exportar desde la vista previa de Markdown de VS Code, o
      pegando el bloque ```mermaid``` en https://mermaid.live).
