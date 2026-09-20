# Este stack quedó en desuso a partir de la Práctica 9

Estos archivos son los que se usaron para calificar la Práctica 8
(93/100) y se dejan intactos como referencia histórica — **no editar**.

A partir de la Práctica 9, el cluster `sa-p8-cluster` lo gestiona
`P9/terraform/` (mismo cluster, mismos nombres de recurso — el estado se
migró con `terraform init -migrate-state`, no se recreó nada). No volver a
correr `terraform apply` ni `terraform destroy` desde esta carpeta: el
estado local (`terraform.tfstate`) que usaba ya no es la fuente de verdad
del cluster real.
