{{/*
Nombre base de la plataforma, usado como prefijo de recursos globales.
*/}}
{{- define "sa-platform.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Labels comunes que se aplican a todos los recursos generados por el chart
padre (no a los subcharts, que tienen su propio _helpers.tpl).
*/}}
{{- define "sa-platform.labels" -}}
app.kubernetes.io/part-of: sa-platform
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/carne: {{ .Values.global.carneEstudiante | default "201901844" | quote }}
sa.usac.edu/environment: {{ .Values.global.environment | default "base" | quote }}
{{- end -}}

{{/*
Namespace de trabajo, con default requerido si falta en values.
*/}}
{{- define "sa-platform.namespace" -}}
{{- .Values.global.namespace | required "global.namespace es obligatorio (sa-p5)" -}}
{{- end -}}

{{/*
Nombre del Secret generado automaticamente por el subchart de Bitnami
postgresql. Se reutiliza en todos los microservicios y cronjobs en vez de
duplicar credenciales en Secrets propios.
*/}}
{{- define "sa-platform.postgresqlSecretName" -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- end -}}

{{/*
Host interno (DNS) del servicio primary de PostgreSQL dentro del cluster.
*/}}
{{- define "sa-platform.postgresqlHost" -}}
{{- printf "%s-postgresql.%s.svc.cluster.local" .Release.Name (include "sa-platform.namespace" .) -}}
{{- end -}}

{{/*
Nombre del Secret del subchart local nats (Practica 6). Contiene las claves
"nats-user" y "nats-password".
*/}}
{{- define "sa-platform.natsSecretName" -}}
{{- printf "%s-nats" .Release.Name -}}
{{- end -}}

{{/*
Host interno (DNS) de NATS dentro del cluster.
*/}}
{{- define "sa-platform.natsHost" -}}
{{- printf "nats.%s.svc.cluster.local" (include "sa-platform.namespace" .) -}}
{{- end -}}
