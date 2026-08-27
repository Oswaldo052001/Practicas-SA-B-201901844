{{- define "reserva-service.fullname" -}}
{{- printf "%s" "reserva-service" -}}
{{- end -}}

{{- define "reserva-service.labels" -}}
app.kubernetes.io/name: reserva-service
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: microservicio
{{- end -}}

{{- define "reserva-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "reserva-service" -}}
{{- else -}}
{{- required "Si serviceAccount.create es false, debe indicarse serviceAccount.name" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
