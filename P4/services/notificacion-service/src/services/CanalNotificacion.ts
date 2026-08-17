/**
 * Abstraccion de un canal de envio de notificaciones. Permite agregar nuevos
 * canales (correo, SMS, push) sin modificar NotificacionService, aplicando
 * el principio de abierto/cerrado.
 */
export interface CanalNotificacion {
  enviar(destinatario: string, asunto: string, mensaje: string): Promise<void>;
}
