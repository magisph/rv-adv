ALTER TABLE public.atendimentos DROP CONSTRAINT IF EXISTS atendimentos_categoria_check;
ALTER TABLE public.atendimentos DROP CONSTRAINT IF EXISTS atendimentos_status_check;
ALTER TABLE public.atendimentos ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE public.atendimentos ADD COLUMN IF NOT EXISTS origem_nome TEXT;
