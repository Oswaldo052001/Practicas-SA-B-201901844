{{- define "cronjob-registro.labels" -}}
app.kubernetes.io/name: cronjob-registro
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: cronjob
{{- end -}}

{{- define "cronjob-registro.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "cronjob-registro" -}}
{{- else -}}
{{- required "serviceAccount.name requerido si create es false" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
