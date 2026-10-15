# Runbook: SLODisponibilidadQuemaLenta

**Severidad:** ticket (se atiende en horario hábil)  
**SLO afectado:** SLO-1 disponibilidad (99 %, 30 días)

## Qué significa
Entre 3 % y 10 % de las peticiones fallan de forma sostenida durante una hora. No es una emergencia, pero consume el presupuesto de error en pocos días.

## Impacto en el usuario
Un porcentaje menor pero persistente de usuarios ve errores intermitentes.

## Diagnóstico (en este orden, ≈ 3 min)
1. Tablero → **Errores por ruta** con ventana de 6 h: ¿empezó con un despliegue (anotación de versión) o gradualmente?
2. Panel de **Saturación**: memoria cerca del límite de 256 MiB (reinicios por OOM), event loop alto o pool de Postgres con `waiting > 0`.
3. LogQL: `{k8s_namespace_name="sa-p8"} | level="error"` para agrupar por `msg`.

## Mitigación
Corregir la causa raíz en el siguiente ciclo de trabajo; si es saturación, subir límites/réplicas por GitOps (values del servicio).

## Después
Registrar en el informe de operación: hora de detección, causa, hora de recuperación y si la alerta fue útil, tardía o ruidosa.
