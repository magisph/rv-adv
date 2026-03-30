-- ==========================================
-- 038_add_unique_constraints.sql
-- Goal: Add unique locks
-- Description: Implement UNIQUE in clients.cpf_cnpj and processes.process_number.
-- ==========================================

DO $$ 
BEGIN
  -- 1. Add unique constraint to clients (cpf_cnpj)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_cpf_cnpj_key'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_cpf_cnpj_key UNIQUE (cpf_cnpj);
  END IF;

  -- 2. Add unique constraint to processes (process_number)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'processes_process_number_key'
  ) THEN
    ALTER TABLE public.processes
      ADD CONSTRAINT processes_process_number_key UNIQUE (process_number);
  END IF;
END $$;
