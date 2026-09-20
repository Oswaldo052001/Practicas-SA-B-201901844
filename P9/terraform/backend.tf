# Estado remoto con bloqueo (criterio 2.2 / requisito previo 8.1: "el
# estado de Terraform reside en un backend remoto; no existe archivo de
# estado en el repositorio"). GCS ya incluye bloqueo nativo (usa una
# operacion atomica sobre el objeto), no hace falta una tabla de lock
# aparte como con S3+DynamoDB.
#
# El bucket "sa-201901844-tfstate" ya existe (creado a mano una sola vez,
# fuera de Terraform, por la razon obvia de que el backend que guarda el
# estado no puede el mismo depender de un recurso que ese estado gestione)
# y tiene versionado activado.
terraform {
  backend "gcs" {
    bucket = "sa-201901844-tfstate"
    prefix = "p9/state"
  }
}
