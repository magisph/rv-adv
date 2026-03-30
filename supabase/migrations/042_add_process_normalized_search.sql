-- =====================================================================
-- Migration: 042_add_process_normalized_search.sql
-- Description: Adiciona coluna para busca O(1) ignorando pontuações
-- =====================================================================

-- 1. Adiciona a coluna
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS process_number_normalized text;

-- 2. Cria a função de trigger
CREATE OR REPLACE FUNCTION public.tg_update_process_number_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.process_number IS NOT NULL THEN
    NEW.process_number_normalized := regexp_replace(NEW.process_number, '\D', '', 'g');
  ELSE
    NEW.process_number_normalized := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Associa a trigger à tabela processes
DROP TRIGGER IF EXISTS trg_normalize_process_number ON public.processes;
CREATE TRIGGER trg_normalize_process_number
BEFORE INSERT OR UPDATE OF process_number
ON public.processes
FOR EACH ROW
EXECUTE FUNCTION public.tg_update_process_number_normalized();

-- 4. Backfill (Atualiza os registros existentes)
UPDATE public.processes 
SET process_number_normalized = regexp_replace(process_number, '\D', '', 'g') 
WHERE process_number IS NOT NULL AND process_number_normalized IS NULL;

-- 5. Criação do índice B-Tree para buscas exatas super rápidas
CREATE INDEX IF NOT EXISTS idx_processes_process_number_normalized 
ON public.processes (process_number_normalized);
