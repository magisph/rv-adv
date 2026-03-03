-- =====================================================================
-- ACTIVATE pg_cron: PericiaPro Deadline Alerts
-- Execute este script no Supabase Dashboard → SQL Editor
-- =====================================================================

-- 1. Habilitar a extensão pg_cron (se não estiver ativa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Habilitar pgcrypto para criptografia de senha_inss
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Agendar o job de alertas diários (08:00 BRT = 11:00 UTC)
SELECT cron.schedule(
  'periciapro-deadline-alerts',
  '0 11 * * *',
  $$SELECT periciapro_check_deadline_alerts()$$
);

-- 4. Verificar que o job foi criado
SELECT * FROM cron.job WHERE jobname = 'periciapro-deadline-alerts';
