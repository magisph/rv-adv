-- 055_robust_roles_and_atendimentos_rls.sql
-- Objetivo: Garantir extração robusta de roles e RLS para atendimentos sem tocar no schema auth.

-- 1. Função Utilitária para Extração de Role (Resiliente a diferentes formatos de claim)
-- Movida para o schema public para evitar restrições de permissão no schema auth durante execução no Editor SQL
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
DECLARE
  role_text text;
  jwt_json jsonb;
BEGIN
  -- Tenta extrair o JWT das configurações da sessão (current_setting)
  -- Isso evita acessar auth.jwt() que pode estar restrito em certos contextos do editor SQL
  BEGIN
    jwt_json := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    jwt_json := '{}'::jsonb;
  END;

  -- Tenta extrair de diferentes locais possíveis no JWT (Claims padrão, metadados de app ou usuário)
  role_text := COALESCE(
    (jwt_json ->> 'user_role'),
    (jwt_json ->> 'role'),
    ((jwt_json -> 'user_metadata') ->> 'role'),
    ((jwt_json -> 'app_metadata') ->> 'user_role')
  );
  
  RETURN COALESCE(role_text, 'advogado'); -- Default para 'advogado' se nada for encontrado
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_role() IS 'Extrai a role do usuário de forma robusta, suportando múltiplos formatos de claims e evitando acesso direto ao schema auth.';

-- 2. Atualizar Políticas de RLS da tabela 'atendimentos' para usar a nova função robusta
DROP POLICY IF EXISTS "atendimentos_update_policy" ON "atendimentos";
DROP POLICY IF EXISTS "atendimentos_delete_policy" ON "atendimentos";

-- Política de UPDATE otimizada
CREATE POLICY "atendimentos_update_policy" ON "atendimentos"
FOR UPDATE TO authenticated
USING (
  (public.get_user_role() = ANY (ARRAY['admin', 'dono']))
  OR
  (created_by = auth.uid())
)
WITH CHECK (
  (public.get_user_role() = ANY (ARRAY['admin', 'dono']))
  OR
  (created_by = auth.uid())
);

-- Política de DELETE otimizada
CREATE POLICY "atendimentos_delete_policy" ON "atendimentos"
FOR DELETE TO authenticated
USING (
  (public.get_user_role() = ANY (ARRAY['admin', 'dono']))
  OR
  (created_by = auth.uid())
);
