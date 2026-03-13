-- Migration 023: Fix atendimentos status and categoria constraints

-- Drop existing constraints if they exist
ALTER TABLE public.atendimentos DROP CONSTRAINT IF EXISTS atendimentos_status_check;
ALTER TABLE public.atendimentos DROP CONSTRAINT IF EXISTS atendimentos_categoria_check;

-- Recreate constraints with all allowed frontend values and backward-compatible values
ALTER TABLE public.atendimentos ADD CONSTRAINT atendimentos_status_check 
CHECK (status IN ('Pendente', 'Em Andamento', 'Concluído', 'Resolvido', 'Convertido'));

ALTER TABLE public.atendimentos ADD CONSTRAINT atendimentos_categoria_check 
CHECK (categoria IN ('Prospecto', 'Cliente', 'Parceiro', 'Parceria', 'Outros'));
