export interface Notificacion {
  id: number;
  usuario_id: number;
  tipo: string;
  destinatario: string;
  asunto: string;
  estado: string;
  enviado_en: Date;
}
