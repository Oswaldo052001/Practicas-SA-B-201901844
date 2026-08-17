import { CanalNotificacion } from "./CanalNotificacion";

/**
 * Implementacion simulada del envio de correo. En un entorno real esta clase
 * usaria un proveedor externo como SendGrid o SES.
 */
export class CanalCorreoSimulado implements CanalNotificacion {
  async enviar(destinatario: string, asunto: string, mensaje: string): Promise<void> {
    console.log(`[correo simulado] Para: ${destinatario} | Asunto: ${asunto} | Mensaje: ${mensaje}`);
  }
}
