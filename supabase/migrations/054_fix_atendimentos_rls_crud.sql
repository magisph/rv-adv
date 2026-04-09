-- 054_fix_atendimentos_rls_crud.sql
-- Fix: Substitui policy FOR ALL por políticas granulares para UPDATE/DELETE
-- Problema: A migração 053 usava FOR ALL que bloqueava INSERT para não-admins
-- Solução: Políticas separadas para cada operação
--额外: Corrige a política INSERT para definir created_by = auth.uid()

-- ============================================
-- PASSO 1: Remover a política problemática (FOR ALL)
-- ============================================
DROP POLICY IF EXISTS "atendimentos_admin_manager_policy" ON "atendimentos";

-- ============================================
-- PASSO 1.5: Criar trigger para auto-preencher created_by
-- ============================================
-- drop trigger if exists set_atendimentos_created_by on atendimentos;
DROP TRIGGER IF EXISTS "set_atendimentos_created_by" ON "atendimentos";
DROP FUNCTION IF EXISTS set_atendimentos_created_by();

CREATE OR REPLACE FUNCTION set_atendimentos_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-preenche created_by se não foi fornecido pelo cliente
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER "set_atendimentos_created_by"
  BEFORE INSERT ON "atendimentos"
  FOR EACH ROW
  EXECUTE FUNCTION set_atendimentos_created_by();

-- ============================================
-- PASSO 1.6: Corrigir a política INSERT
-- ============================================
DROP POLICY IF EXISTS "atendimentos_insert_policy" ON "atendimentos";

CREATE POLICY "atendimentos_insert_policy" ON "atendimentos"
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (created_by = auth.uid() OR created_by IS NULL)  -- Permite NULL (será preenchido pelo trigger)
);

-- ============================================
-- PASSO 2: Criar políticas granulares
-- ============================================

-- UPDATE: Admin/Dono OU dono do registro (created_by)
CREATE POLICY "atendimentos_update_policy" ON "atendimentos"
FOR UPDATE TO authenticated
USING (
  -- Verifica se é admin ou dono (pelo role no JWT)
  COALESCE(
    (auth.jwt() ->> 'user_role'::text), 
    (auth.jwt() ->> 'role'::text), 
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text)
  ) = ANY (ARRAY['admin'::text, 'dono'::text])
  OR
  -- OU é o dono do registro
  created_by = auth.uid()
)
WITH CHECK (
  COALESCE(
    (auth.jwt() ->> 'user_role'::text), 
    (auth.jwt() ->> 'role'::text), 
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text)
  ) = ANY (ARRAY['admin'::text, 'dono'::text])
  OR
  created_by = auth.uid()
);

-- DELETE: Admin/Dono OU dono do registro (created_by)
CREATE POLICY "atendimentos_delete_policy" ON "atendimentos"
FOR DELETE TO authenticated
USING (
  -- Verifica se é admin ou dono (pelo role no JWT)
  COALESCE(
    (auth.jwt() ->> 'user_role'::text), 
    (auth.jwt() ->> 'role'::text), 
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text)
  ) = ANY (ARRAY['admin'::text, 'dono'::text])
  OR
  -- OU é o dono do registro
  created_by = auth.uid()
);

-- ============================================
-- PASSO 3: Adicionar índice para performance RLS
-- ============================================
-- O índice em created_by melhora performance das políticas RLS
CREATE INDEX IF NOT EXISTS idx_atendimentos_created_by 
ON public.atendimentos(created_by);

-- ============================================
-- RESUMO das políticas resultantes:
-- ============================================
-- atendimentos_select_policy    -> SELECT:  authenticated (qualquer usuário)
-- atendimentos_insert_policy   -> INSERT:  authenticated (qualquer usuário autenticado)
-- atendimentos_update_policy   -> UPDATE:  admin/dono OU created_by = auth.uid()
-- atendimentos_delete_policy   -> DELETE:  admin/dono OU created_by = auth.uid()
-- Trigger: set_atendimentos_created_by -> Auto-preenche created_by na inserção
-- Índice: idx_atendimentos_created_by -> Performance RLS
-- ============================================
