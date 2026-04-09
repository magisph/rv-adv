-- 1. Adicionar coluna created_by
ALTER TABLE public.atendimentos 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Atualizar políticas RLS para atendimentos
-- Remover políticas antigas
DROP POLICY IF EXISTS "atendimentos_select_policy" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_insert_policy" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_update_policy" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_delete_policy" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_user_select" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_user_insert" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_user_update" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_admin_all" ON "atendimentos";

-- Criar novas políticas robustas
-- Acesso para leitura: todos autenticados podem ver (ajustar se necessário para verem apenas os próprios)
CREATE POLICY "atendimentos_select_policy" ON "atendimentos"
FOR SELECT TO authenticated
USING (true);

-- Criação: qualquer autenticado pode criar
CREATE POLICY "atendimentos_insert_policy" ON "atendimentos"
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Atualização e Exclusão: Administradores e Donos podem tudo
CREATE POLICY "atendimentos_admin_manager_policy" ON "atendimentos"
FOR ALL TO authenticated
USING (
  COALESCE(
    (auth.jwt() ->> 'user_role'::text), 
    (auth.jwt() ->> 'role'::text), 
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text)
  ) = ANY (ARRAY['admin'::text, 'dono'::text])
);
