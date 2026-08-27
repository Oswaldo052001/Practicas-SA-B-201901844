{{- define "cronjob-resumen.labels" -}}
app.kubernetes.io/name: cronjob-resumen
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: cronjob
{{- end -}}

{{- define "cronjob-resumen.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "cronjob-resumen" -}}
{{- else -}}
{{- required "serviceAccount.name requerido si create es false" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
