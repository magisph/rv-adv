-- =====================================================================
-- PericiaPro Schema Migration: Base44 JSON → PostgreSQL (Supabase)
-- Generated: 2026-03-02
-- =====================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- TABELA: pericias
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pericias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL,
  senha_inss text, -- Considere criptografar com pgcrypto em produção
  esfera text CHECK (esfera IN ('Administrativa', 'Judicial')) NOT NULL,
  status text CHECK (status IN (
    'Benefício Ativo',
    'Perícia Agendada',
    'Documentos Pendentes',
    'Benefício Cessado',
    'Benefício Negado'
  )) NOT NULL DEFAULT 'Benefício Ativo',
  documentos_pendentes text,
  dib date,
  dcb date,
  data_pericia date,
  horario_pericia time WITHOUT TIME ZONE,
  local_pericia text,
  observacoes text,
  alerta_dcb_exibido boolean DEFAULT false,
  alertas_pericia_exibidos integer[] DEFAULT '{}',
  google_calendar_event_id text,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: pericia_pagamentos (normalizado de JSONB array)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pericia_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pericia_id uuid REFERENCES pericias(id) ON DELETE CASCADE NOT NULL,
  valor numeric(12,2) NOT NULL,
  data date,
  status text CHECK (status IN ('pago', 'pendente')) DEFAULT 'pendente',
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: pericia_documentos (normalizado de JSONB array)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pericia_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pericia_id uuid REFERENCES pericias(id) ON DELETE CASCADE NOT NULL,
  nome text,
  url text,
  tipo text,
  categoria text,
  data_upload date,
  storage_path text,
  classificacao_ia jsonb, -- Resultado da classificação OCR/IA do RV-Adv
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: activity_logs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pericia_id uuid REFERENCES pericias(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN (
    'status_change', 'payment', 'document', 'update', 'reminder', 'creation'
  )) NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: lembretes
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS lembretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pericia_id uuid REFERENCES pericias(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  data_lembrete date NOT NULL,
  concluido boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: notifications
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  pericia_id uuid REFERENCES pericias(id) ON DELETE CASCADE NOT NULL,
  pericia_nome text,
  type text CHECK (type IN ('dcb', 'pericia')) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  days_until integer,
  event_date date,
  is_read boolean DEFAULT false,
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- TABELA: notification_preferences
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  email_notifications_enabled boolean DEFAULT true,
  in_app_notifications_enabled boolean DEFAULT true,
  dcb_alert_days integer[] DEFAULT '{15,7,3,1}',
  pericia_alert_days integer[] DEFAULT '{45,30,15,7,3,1}',
  email_daily_digest boolean DEFAULT false,
  critical_alerts_only boolean DEFAULT false,
  dcb_alert_template text,
  pericia_alert_template text,
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- Trigger: updated_at automático para pericias
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pericias_updated_at
  BEFORE UPDATE ON pericias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
