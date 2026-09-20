# Diagrama del bootstrap de día cero (criterio 1.3 / entregable "Diagrama del bootstrap")

Universidad San Carlos de Guatemala, Software Avanzado, Sección B, carné
201901844. Orden de reconstrucción y dependencias entre componentes, desde
`terraform apply` hasta que el sistema de negocio (sa-platform) está
sirviendo tráfico con datos reales. Distingue lo **automático** (todo,
dentro de un único comando) de lo que en Práctica 8 era manual.

```mermaid
flowchart TD
    A["Persona ejecuta:\nterraform apply\n(dentro de P9/terraform)"] --> B["Terraform: cluster GKE\n+ subred + firewall\n(cluster.tf / subnet.tf)"]
    B --> C["Terraform: namespace,\ncuotas y RBAC\n(namespace.tf / quotas.tf / rbac.tf)"]
    C --> D["Terraform (helm_release):\ninstala ArgoCD\n(argocd.tf)"]
    D --> E["Terraform (helm_release):\ninstala Velero\napuntando al bucket externo\n(velero.tf)"]
    E --> F["Terraform (null_resource):\nbusca el último respaldo de\nla llave de Sealed Secrets\ny la restaura si existe\n(sealed-secrets.tf + scripts/restore-sealed-secrets-key.sh)"]
    F --> G["Terraform (helm_release):\ninstala el controlador de\nSealed Secrets\n(reutiliza la llave restaurada,\nsi habia una)"]
    G --> H["Terraform (null_resource):\nkubectl apply de la Application\nraiz 'sa-platform-root'\n(bootstrap-app.tf)"]
    H --> I["ArgoCD sincroniza\nbootstrap/apps (repo GitOps)\n= patron app-of-apps"]
    I --> J["Application hija:\nsa-platform"]
    I --> K["Application hija:\nvelero-resources"]
    J --> J1["postgresql + nats\n(con hooks de respaldo\nen postgresql)"]
    J --> J2["7 microservicios\n(api-gateway con 2 replicas\n+ anti-afinidad + PDB)"]
    J --> J3["SealedSecret ya sellados\n(se descifran con la llave\nrestaurada en el paso F)"]
    K --> K1["Schedule: schedule-datos\n(namespace sa-p8, diario 03:00,\nretencion 30 dias)"]
    K --> K2["Schedule: sealed-secrets-key-backup\n(kube-system, diario 04:00,\nretencion 90 dias)"]
    J1 --> L["Sistema sirviendo trafico\ncon datos reales\n(fin del bootstrap)"]
    J2 --> L
    J3 --> L

    style A fill:#d1e7dd,stroke:#0f5132
    style L fill:#d1e7dd,stroke:#0f5132
    style H fill:#fff3cd,stroke:#997404
```

## Qué es automático y qué requiere una decisión humana previa

Todo el flujo de `A` a `L` corre dentro de **un solo `terraform apply`**
(criterio 2.1, "sin pasos manuales"). El nodo resaltado en amarillo (`H`)
es el único punto donde Terraform ejecuta `kubectl` directamente (via
`local-exec`), en vez de un recurso nativo de un provider — la razón
técnica está documentada en el comentario de
[`P9/terraform/bootstrap-app.tf`](../terraform/bootstrap-app.tf): el
provider `kubernetes_manifest` de Hashicorp necesita conocer el esquema
del CRD `Application` en tiempo de `plan`, y ese CRD lo acaba de instalar
`helm_release.argocd` en el mismo `apply` — forzaría a correr `terraform
apply` dos veces, lo cual sí contaría como intervención manual.

La única decisión que sigue siendo de una persona, y a propósito NO está
automatizada, es la **promoción del canary de Argo Rollouts al 100% del
tráfico** (heredada de la Práctica 8, ver
[`P8/docs/diagrama-gitops.md`](../../P8/docs/diagrama-gitops.md)): eso es
parte del flujo de *entrega* de una nueva versión de la aplicación, no del
bootstrap de la infraestructura, y la Práctica 9 pide explícitamente
conservar ese flujo tal cual ("Conservación del flujo de la Práctica 8").
