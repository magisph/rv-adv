-- =====================================================================
-- Migration: 015_fase1_roles_e_cadunico
-- Description: Adiciona coluna cadunico_updated_at em clients
--              e redefine RLS de financials para bloquear 'secretaria' e 'assistente'.
-- =====================================================================

-- 1. Adicionar cadunico_updated_at na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cadunico_updated_at DATE;

-- 2. Expandir as roles permitidas na tabela users
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND pg_get_constraintdef(oid) LIKE '%role%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin','user','guest','secretaria','assistente','dono'));

-- Garantir acesso a quem tiver 'dono' também caso a regra mude.

-- 3. Atualizar Políticas de Segurança da tabela financials
-- Removemos as antigas (que davam permissão total para authenticated)
DROP POLICY IF EXISTS financials_select_policy ON financials;
DROP POLICY IF EXISTS financials_insert_policy ON financials;
DROP POLICY IF EXISTS financials_update_policy ON financials;
DROP POLICY IF EXISTS financials_delete_policy ON financials;

-- Criamos as novas que filtram 'secretaria' e 'assistente'
CREATE POLICY financials_select_policy ON financials
FOR SELECT TO authenticated
USING (
  coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') NOT IN ('secretaria', 'assistente')
);

CREATE POLICY financials_insert_policy ON financials
FOR INSERT TO authenticated
WITH CHECK (
  coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') NOT IN ('secretaria', 'assistente')
);

CREATE POLICY financials_update_policy ON financials
FOR UPDATE TO authenticated
USING (
  coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') NOT IN ('secretaria', 'assistente')
)
WITH CHECK (
  coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') NOT IN ('secretaria', 'assistente')
);

CREATE POLICY financials_delete_policy ON financials
FOR DELETE TO authenticated
USING (
  coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') NOT IN ('secretaria', 'assistente')
);
