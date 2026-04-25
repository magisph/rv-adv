-- ============================================================================
-- Migração: Colunas de Auditoria de Prazo — Calculadora Autônoma CPC/2015
-- Adiciona campos à tabela deadlines para persistir os metadados calculados
-- pela Edge Function calculadora-prazos após a classificação via IA.
--
-- Arquitetura: classify-publication → calculadora-prazos → deadlines.due_date
-- ============================================================================

-- Adiciona colunas de auditoria do cálculo matemático de prazos
ALTER TABLE public.deadlines
  ADD COLUMN IF NOT EXISTS prazo_d1                 DATE,          -- D1: 1º dia útil após publicação (CPC art. 224 §1º)
  ADD COLUMN IF NOT EXISTS prazo_recesso_aplicado   BOOLEAN        DEFAULT FALSE,   -- Flag: recesso forense foi pulado no cálculo
  ADD COLUMN IF NOT EXISTS prazo_total_dias_corridos INTEGER;      -- Dias corridos (D0 → due_date) — dado de auditoria

-- Comentários descritivos para fins de documentação no schema
COMMENT ON COLUMN public.deadlines.due_date IS
  'Data de vencimento do prazo processual, calculada matematicamente pela Edge Function calculadora-prazos (CPC/2015).';

COMMENT ON COLUMN public.deadlines.prazo_d1 IS
  'Primeiro dia útil após a data de publicação da intimação (D1 do prazo — CPC art. 224 §1º).';

COMMENT ON COLUMN public.deadlines.prazo_recesso_aplicado IS
  'TRUE se o recesso forense (20/12 a 20/01 — CNJ 318/2020) foi aplicado no cálculo do prazo.';

COMMENT ON COLUMN public.deadlines.prazo_total_dias_corridos IS
  'Total de dias corridos entre a publicação (D0) e o vencimento (due_date) — dado de auditoria, não entra na contagem útil.';

-- Índice para consultas de vencimentos próximos (dashboard Kanban)
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date_processo
  ON public.deadlines(due_date, processo_id)
  WHERE due_date IS NOT NULL;

-- Índice para filtrar prazos com recesso aplicado (relatórios)
CREATE INDEX IF NOT EXISTS idx_deadlines_recesso
  ON public.deadlines(prazo_recesso_aplicado)
  WHERE prazo_recesso_aplicado = TRUE;
