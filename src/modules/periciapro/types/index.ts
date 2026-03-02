// PericiaPro Domain Types

export type PericiaEsfera = 'Administrativa' | 'Judicial';

export type PericiaStatus =
  | 'Benefício Ativo'
  | 'Perícia Agendada'
  | 'Documentos Pendentes'
  | 'Benefício Cessado'
  | 'Benefício Negado';

export type ActivityLogType =
  | 'status_change'
  | 'payment'
  | 'document'
  | 'update'
  | 'reminder'
  | 'creation';

export type NotificationType = 'dcb' | 'pericia';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type PagamentoStatus = 'pago' | 'pendente';

export interface Pericia {
  id: string;
  nome: string;
  cpf: string;
  senha_inss?: string;
  esfera: PericiaEsfera;
  status: PericiaStatus;
  documentos_pendentes?: string;
  dib?: string;
  dcb?: string;
  data_pericia?: string;
  horario_pericia?: string;
  local_pericia?: string;
  observacoes?: string;
  alerta_dcb_exibido: boolean;
  alertas_pericia_exibidos: number[];
  google_calendar_event_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PericiaPagamento {
  id: string;
  pericia_id: string;
  valor: number;
  data?: string;
  status: PagamentoStatus;
  observacao?: string;
  created_at: string;
}

export interface PericiaDocumento {
  id: string;
  pericia_id: string;
  nome?: string;
  url?: string;
  tipo?: string;
  categoria?: string;
  data_upload?: string;
  storage_path?: string;
  classificacao_ia?: Record<string, unknown>;
}

export interface ActivityLog {
  id: string;
  pericia_id: string;
  type: ActivityLogType;
  description: string;
  metadata?: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface Lembrete {
  id: string;
  pericia_id?: string;
  titulo: string;
  descricao?: string;
  data_lembrete: string;
  concluido: boolean;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  pericia_id: string;
  pericia_nome?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  days_until?: number;
  event_date?: string;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications_enabled: boolean;
  in_app_notifications_enabled: boolean;
  dcb_alert_days: number[];
  pericia_alert_days: number[];
  email_daily_digest: boolean;
  critical_alerts_only: boolean;
  dcb_alert_template?: string;
  pericia_alert_template?: string;
}
