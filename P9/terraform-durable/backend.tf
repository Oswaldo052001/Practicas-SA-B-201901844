# Backend remoto de ESTE stack (el "durable"). Vive en el MISMO bucket que
# el estado del stack principal (creado a mano por el estudiante, ver
# ../terraform/backend.tf), pero bajo un prefix distinto, para que sean dos
# estados independientes.
#
# POR QUE ESTE STACK ES UN ROOT DE TERRAFORM SEPARADO (no un archivo mas
# dentro de ../terraform):
#   La Practica 9 pide una prueba de recuperacion que DESTRUYE Y RECONSTRUYE
#   el entorno completo (ver ../terraform, que si se destruye durante la
#   prueba de DR). El bucket de respaldos de Velero y la cuenta de servicio
#   que lo escribe NO pueden vivir en ese mismo estado: si estuvieran ahi,
#   un "terraform destroy" del entorno borraria tambien los respaldos que
#   se supone que lo van a recuperar (exactamente el error de diseno de
#   Code Spaces en 2014: los respaldos vivian en la misma cuenta/alcance que
#   los datos primarios, y se perdieron los dos a la vez).
#
#   Este stack se aplica UNA vez, al principio, y nunca se destruye entre
#   pruebas de recuperacion.
terraform {
  backend "gcs" {
    bucket = "sa-201901844-tfstate"
    prefix = "p9/state-durable"
  }
}
