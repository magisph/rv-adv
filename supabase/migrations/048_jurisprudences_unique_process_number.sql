-- =====================================================================
-- Migration 048: Adiciona constraint UNIQUE em jurisprudences.process_number
-- Necessário para suporte a upsert (ON CONFLICT) na Edge Function scrape-tnu.
-- =====================================================================

-- Adiciona constraint UNIQUE em process_number (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jurisprudences_process_number_key'
      AND conrelid = 'public.jurisprudences'::regclass
  ) THEN
    ALTER TABLE public.jurisprudences
      ADD CONSTRAINT jurisprudences_process_number_key UNIQUE (process_number);
  END IF;
END $$;

-- Índice para suporte à constraint (se não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jurisprudences_process_number
  ON public.jurisprudences (process_number)
  WHERE process_number IS NOT NULL;
