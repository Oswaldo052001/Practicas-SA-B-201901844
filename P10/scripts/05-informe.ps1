# Paso 6 - Genera P10\docs\informe-operacion.md rellenando la plantilla con los
# tiempos reales medidos por 02-canary-falla.ps1 y 03-sintoma-causa.ps1.
# (Ejecutalo despues de ambos demos; luego exporta el .md a PDF si lo piden.)
. "$PSScriptRoot\_comun.ps1"
$plantilla = Join-Path $PSScriptRoot "..\docs\informe-operacion.plantilla.md"
$s = Get-Content (Join-Path $script:Evidencias "datos-sintoma.json") -Raw | ConvertFrom-Json
$c = Get-Content (Join-Path $script:Evidencias "datos-canary.json") -Raw | ConvertFrom-Json
function Fmt($seg) { if ($seg -eq $null) { return "n/d" } else { return ("{0} min {1:00} s" -f [math]::Floor($seg/60), ($seg % 60)) } }
$texto = Get-Content $plantilla -Raw -Encoding UTF8
$mapa = @{
  "{{FECHA}}"            = $s.t0
  "{{DETECCION_METRICAS}}" = (Fmt $s.deteccion_metricas_s)
  "{{DETECCION_ALERTA}}"   = (Fmt $s.deteccion_alerta_s)
  "{{ALERTA_A_CAUSA}}"     = (Fmt $s.alerta_a_causa_s)
  "{{CAUSA_TOTAL}}"        = (Fmt $s.causa_total_s)
  "{{RECUPERACION}}"       = (Fmt $s.recuperacion_s)
  "{{ALERTAS_DISPARADAS}}" = $(if ($s.alertas_disparadas) { $s.alertas_disparadas } else { "ninguna" })
  "{{CANARY_SEGUNDOS}}"    = (Fmt $c.canary_reversion_segundos)
}
foreach ($k in $mapa.Keys) { $texto = $texto.Replace($k, [string]$mapa[$k]) }
Set-Content -Path (Join-Path $PSScriptRoot "..\docs\informe-operacion.md") -Value $texto -Encoding UTF8
Ok "informe generado: P10\docs\informe-operacion.md"
