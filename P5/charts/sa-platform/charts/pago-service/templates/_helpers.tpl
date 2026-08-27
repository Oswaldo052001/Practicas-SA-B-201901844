{{- define "pago-service.fullname" -}}
{{- printf "%s" "pago-service" -}}
{{- end -}}

{{- define "pago-service.labels" -}}
app.kubernetes.io/name: pago-service
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: microservicio
{{- end -}}

{{- define "pago-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "pago-service" -}}
{{- else -}}
{{- required "Si serviceAccount.create es false, debe indicarse serviceAccount.name" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
