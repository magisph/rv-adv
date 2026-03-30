-- ==========================================
-- 041_add_performance_indexes.sql
-- Goal: Improve lookup performance
-- Description: Add missing optimization indexes for external process IDs and emails.
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_clients_numero_processo_adm 
ON public.clients(numero_processo_administrativo);

CREATE INDEX IF NOT EXISTS idx_clients_numero_processo_jud 
ON public.clients(numero_processo_judicial);

CREATE INDEX IF NOT EXISTS idx_clients_email 
ON public.clients(email);

CREATE INDEX IF NOT EXISTS idx_users_email 
ON public.users(email);
