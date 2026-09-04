# Costos del despliegue - Practica 6

## Recursos que generan costo

| Recurso | Cantidad | Costo aproximado (region us-central1, precio bajo demanda) |
|---|---|---|
| Nodos GKE (`e2-medium`, 2 vCPU / 4 GB) | 2 | ~US$0.034/hora cada uno &rarr; ~US$0.07/hora en total |
| Cuota de administracion de cluster GKE (Standard) | 1 cluster | US$0.10/hora por cluster (una sola cuota, independiente del numero de nodos) |
| Discos persistentes (`standard-rwo`) | ~3 GB total (Postgres 2Gi + NATS 1Gi) | Centavos de dolar por hora, prorrateado |
| Cloud Load Balancer (forwarding rule del Service) | 1 | ~US$0.025/hora + trafico saliente |
| Artifact Registry (almacenamiento de 7 imagenes) | ~1-2 GB | Dentro de la capa gratuita (0.5 GB/mes gratis; el resto es centavos) |

**Estimado total mientras el cluster esta arriba: entre US$0.20 y US$0.25 por
hora.** Para el tiempo que se necesita realmente (levantar, tomar
evidencias, mostrar al auxiliar, apagar - unas 1-2 horas en total), el costo
real es de unos pocos centavos de dolar, muy por debajo de los US$300 de
credito de estudiante.

## Como se redujeron los costos

- **2 nodos** (el minimo que exige la rubrica), no mas.
- `e2-medium` en vez de un tipo de maquina mayor: alcanza para los 7
  microservicios + PostgreSQL + NATS con los `resources.requests` definidos
  en `values-prod.yaml`/`values-gke.yaml`, sin sobredimensionar.
- **Discos pequenos** (2Gi Postgres, 1Gi NATS): el `ResourceQuota` y el
  tamano de los PVC del chart ya estaban dimensionados al minimo necesario
  desde la Practica 5.
- **El cluster no se deja corriendo**: se levanta justo antes de tomar
  evidencia o de presentar al auxiliar, y se elimina inmediatamente despues
  (`scripts/eliminar-recursos.ps1`), que es lo que realmente detiene el
  cobro por nodos y por el Load Balancer.
- Artifact Registry: al usar el registro nativo del proveedor en vez de un
  registry externo de pago, el almacenamiento de las imagenes queda dentro
  de la capa gratuita.
- No se uso un segundo entorno (staging) en la nube para esta practica: solo
  el namespace `sa-p6`, evitando duplicar el costo de cluster/discos.

## Otras formas de reducir costos que no se aplicaron (pero son validas)

- Usar **GKE Autopilot** en vez de GKE Standard: se paga solo por los
  recursos que consumen los pods (no por nodo completo), pero tiene menos
  control sobre el tipo de maquina y puede complicar el cumplimiento
  estricto de "al menos 2 nodos" como concepto visible en la rubrica.
- Reservar una **instancia reservada/comprometida** no aplica para un uso de
  pocas horas como este.
