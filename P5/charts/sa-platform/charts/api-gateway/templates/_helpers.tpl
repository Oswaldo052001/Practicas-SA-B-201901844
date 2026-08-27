{{- define "api-gateway.fullname" -}}
{{- printf "%s" "api-gateway" -}}
{{- end -}}

{{- define "api-gateway.labels" -}}
app.kubernetes.io/name: api-gateway
app.kubernetes.io/instance: {{ .Release.Name }}
sa.usac.edu/role: gateway
{{- end -}}

{{- define "api-gateway.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" "api-gateway" -}}
{{- else -}}
{{- required "Si serviceAccount.create es false, debe indicarse serviceAccount.name" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
