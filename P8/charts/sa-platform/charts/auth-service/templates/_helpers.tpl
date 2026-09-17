{{- define "auth-service.fullname" -}}
{{- printf "%s" "auth-service" -}}
{{- end -}}

{{- define "auth-service.labels" -}}
app.kubernetes.io/name: auth-service
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: microservicio
{{- end -}}

{{- define "auth-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "auth-service" -}}
{{- else -}}
{{- required "Si serviceAccount.create es false, debe indicarse serviceAccount.name" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
