-- Migration: 034_add_ti_email_exclusivo.sql
-- Description: Adiciona a coluna ti_email_exclusivo à tabela clients para
--              armazenar o e-mail exclusivo do cliente proveniente da API
--              da Tramitação Inteligente (TI), sem conflito com o campo
--              email padrão do sistema RV-Adv.
--
-- Nota: Esta migration é idempotente (IF NOT EXISTS).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS ti_email_exclusivo TEXT;

COMMENT ON COLUMN public.clients.ti_email_exclusivo IS
  'E-mail exclusivo cadastrado na API da Tramitação Inteligente (campo email_exclusivo). Separado do email principal do sistema.';
