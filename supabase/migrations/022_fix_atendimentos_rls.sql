-- 022_fix_atendimentos_rls.sql

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Allow ALL for authenticated users" ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_select_policy" ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_insert_policy" ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_update_policy" ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_delete_policy" ON public.atendimentos;

-- Garantir que o RLS está ativo
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Política de SELECT para a role 'authenticated' (leitura liberada)
CREATE POLICY "atendimentos_select_policy"
ON public.atendimentos
FOR SELECT
TO authenticated
USING (true);

-- Política de INSERT para a role 'authenticated'
CREATE POLICY "atendimentos_insert_policy"
ON public.atendimentos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Política de UPDATE permitindo apenas para usuários com patente alta
CREATE POLICY "atendimentos_update_policy"
ON public.atendimentos
FOR UPDATE
TO authenticated
USING (coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono'));

-- Política de DELETE permitindo apenas para usuários com patente alta
CREATE POLICY "atendimentos_delete_policy"
ON public.atendimentos
FOR DELETE
TO authenticated
USING (coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono'));
