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
- [ ] Log del job `deploy` mostrando el `helm upgrade` exitoso y la salida
      de `kubectl rollout status` / `kubectl get pods`.

## 3. Registro de contenedores

- [ ] Pagina de paquetes de GitHub (`https://github.com/users/<usuario>/packages`)
      mostrando los 7 paquetes `sa-p7/<servicio>` publicados.

## 4. Cluster despues del despliegue

- [ ] `kubectl get pods -n sa-p6 -o wide` (todos `Running`, imagenes con el
      tag nuevo).
- [ ] `kubectl get deployment -n sa-p6 -o jsonpath` o `kubectl describe`
      de un deployment mostrando la imagen actualizada.

## 5. Diagrama del pipeline

- [ ] Captura o export del diagrama Mermaid de `01-diagrama-pipeline.md`
      (se puede exportar desde la vista previa de Markdown de VS Code, o
      pegando el bloque ```mermaid``` en https://mermaid.live).
