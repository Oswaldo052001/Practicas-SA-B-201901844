# Funciones compartidas por los scripts de la Practica 10 (se cargan con ". .\_comun.ps1").
# Requisitos: kubectl y gcloud autenticados contra el cluster sa-p8-cluster
#   gcloud container clusters get-credentials sa-p8-cluster --zone us-central1-c --project cinetix-p6
$ErrorActionPreference = "Continue"   # (con "Stop", PowerShell 5.1 trata el stderr de kubectl como error fatal)

$script:RepoCodigo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$script:RepoGitops = Join-Path (Split-Path $script:RepoCodigo -Parent) ((Split-Path $script:RepoCodigo -Leaf) + "-gitops")
$script:Evidencias = Join-Path $PSScriptRoot "..\docs\evidencias"
$script:Faults     = Join-Path $script:RepoGitops "apps\sa-platform\values-p10-faults.yaml"
$script:Ns         = "sa-p8"
$script:Obs        = "observability"

New-Item -ItemType Directory -Force -Path $script:Evidencias | Out-Null

function Paso($texto) { Write-Host ""; Write-Host "==> $texto" -ForegroundColor Cyan }
function Ok($texto)   { Write-Host "  [OK]   $texto" -ForegroundColor Green }
function Falla($texto){ Write-Host "  [FALLA] $texto" -ForegroundColor Red }
function Aviso($texto){ Write-Host "  [AVISO] $texto" -ForegroundColor Yellow }

function Ahora { (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") }

function Guardar-Evidencia($nombre, $texto) {
  $ruta = Join-Path $script:Evidencias $nombre
  Set-Content -Path $ruta -Value $texto -Encoding UTF8
  Write-Host "  evidencia guardada: P10\docs\evidencias\$nombre" -ForegroundColor DarkGray
}

# Consulta instantanea a Prometheus (por dentro del pod, sin port-forward).
function Prom($consulta) {
  $q = [uri]::EscapeDataString($consulta)
  $salida = kubectl -n $script:Obs exec prometheus-kps-prometheus-0 -c prometheus -- wget -qO- "http://localhost:9090/api/v1/query?query=$q" 2>$null
  if (-not $salida) { return $null }
  return ($salida | ConvertFrom-Json)
}
function Prom-Valor($consulta) {
  $r = Prom $consulta
  if ($r -and $r.data.result.Count -gt 0) { return [double]$r.data.result[0].value[1] }
  return $null
}

# Cambia un valor "CLAVE: "valor"" dentro de values-p10-faults.yaml (bloque del servicio dado).
function Poner-Fallo($servicio, $clave, $valor) {
  $lineas = Get-Content $script:Faults
  $dentro = $false
  for ($i = 0; $i -lt $lineas.Count; $i++) {
    if ($lineas[$i] -match '^[a-z]') { $dentro = ($lineas[$i] -match "^$servicio\s*:") }
    if ($dentro -and $lineas[$i] -match "^(\s+$clave\s*:\s*)""[^""]*""") {
      $lineas[$i] = $Matches[1] + '"' + $valor + '"'
    }
  }
  Set-Content -Path $script:Faults -Value $lineas -Encoding UTF8
}

# Commit + push en el repo GitOps (solo del archivo de fallos) y fuerza a ArgoCD a leerlo ya.
function Publicar-Gitops($mensaje) {
  Push-Location $script:RepoGitops
  try {
    git add apps/sa-platform/values-p10-faults.yaml
    git commit -m $mensaje | Out-Null
    git push | Out-Null
  } finally { Pop-Location }
  kubectl -n argocd annotate application sa-platform-root argocd.argoproj.io/refresh=hard --overwrite | Out-Null
  kubectl -n argocd annotate application sa-platform argocd.argoproj.io/refresh=hard --overwrite | Out-Null
}
