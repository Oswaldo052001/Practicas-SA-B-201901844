{{- define "nats.fullname" -}}
{{- printf "%s" "nats" -}}
{{- end -}}

{{- define "nats.labels" -}}
app.kubernetes.io/name: nats
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: broker
{{- end -}}

{{- define "nats.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "nats" -}}
{{- else -}}
{{- required "Si serviceAccount.create es false, debe indicarse serviceAccount.name" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
