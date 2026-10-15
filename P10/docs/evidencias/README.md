# Evidencias

Esta carpeta se llena sola al ejecutar los scripts de `P10/scripts`:

| Archivo | Lo genera | Contenido |
|---|---|---|
| `verificacion.txt` | `01-verificar.ps1` | OK/FALLA de ArgoCD, Prometheus, Tempo, Loki, reglas, AnalysisTemplate |
| `canary-reversion.txt`, `datos-canary.json` | `02-canary-falla.ps1` | Reversión automática del canary: AnalysisRun fallido, tiempos |
| `sintoma-causa.txt`, `datos-sintoma.json` | `03-sintoma-causa.ps1` | Cronología alerta → traza → log, con tiempos |
| `captura-*.png` | a mano | Capturas del tablero, de la alerta y de la traza (ver README, sección 6) |
