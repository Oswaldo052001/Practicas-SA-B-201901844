{{- define "notificacion-service.fullname" -}}
{{- printf "%s" "notificacion-service" -}}
{{- end -}}

{{- define "notificacion-service.labels" -}}
app.kubernetes.io/name: notificacion-service
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: microservicio
{{- end -}}

{{- define "notificacion-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "notificacion-service" -}}
{{- else -}}
{{- required "Si serviceAccount.create es false, debe indicarse serviceAccount.name" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
