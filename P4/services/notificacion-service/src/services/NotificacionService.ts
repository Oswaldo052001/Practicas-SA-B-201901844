import { NotificacionRepository } from "../repositories/NotificacionRepository";
import { CanalNotificacion } from "./CanalNotificacion";

export class NotificacionService {
  constructor(
    private notificacionRepository: NotificacionRepository,
    private canal: CanalNotificacion
  ) {}

  async notificar(usuario_id: number, tipo: string, destinatario: string, asunto: string, mensaje: string) {
    await this.canal.enviar(destinatario, asunto, mensaje);
    return this.notificacionRepository.crear({ usuario_id, tipo, destinatario, asunto });
  }

  async listarPorUsuario(usuario_id: number) {
    return this.notificacionRepository.listarPorUsuario(usuario_id);
  }
}
