-- Migration: 018_auditoria_db_fixes
-- Description: Correções de segurança e performance apontadas pela auditoria

-- 1. Tabela Financials: Refatorar políticas (Performance e Fail-Close)
DROP POLICY IF EXISTS financials_select_policy ON public.financials;
DROP POLICY IF EXISTS financials_insert_policy ON public.financials;
DROP POLICY IF EXISTS financials_update_policy ON public.financials;
DROP POLICY IF EXISTS financials_delete_policy ON public.financials;

CREATE POLICY financials_select_policy ON public.financials
FOR SELECT TO authenticated
USING (
  coalesce(auth.jwt() ->> 'user_role', 'guest') NOT IN ('secretaria', 'assistente')
);

CREATE POLICY financials_insert_policy ON public.financials
FOR INSERT TO authenticated
WITH CHECK (
  coalesce(auth.jwt() ->> 'user_role', 'guest') NOT IN ('secretaria', 'assistente')
);

CREATE POLICY financials_update_policy ON public.financials
FOR UPDATE TO authenticated
USING (
  coalesce(auth.jwt() ->> 'user_role', 'guest') NOT IN ('secretaria', 'assistente')
)
WITH CHECK (
  coalesce(auth.jwt() ->> 'user_role', 'guest') NOT IN ('secretaria', 'assistente')
);

CREATE POLICY financials_delete_policy ON public.financials
FOR DELETE TO authenticated
USING (
  coalesce(auth.jwt() ->> 'user_role', 'guest') NOT IN ('secretaria', 'assistente')
);

-- 2. Tabela Atendimentos: Blindagem RLS e Índices
DROP POLICY IF EXISTS "Allow ALL for authenticated users" ON public.atendimentos;

-- (a) 'admin'/'dono' podem fazer TUDO
CREATE POLICY atendimentos_admin_all ON public.atendimentos
FOR ALL TO authenticated
USING (
  coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono')
)
WITH CHECK (
  coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono')
);

-- (b) 'secretaria'/'assistente' ou apenas 'user' podem dar SELECT, INSERT e UPDATE, mas NUNCA DELETE
CREATE POLICY atendimentos_user_select ON public.atendimentos
FOR SELECT TO authenticated
USING (
  coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('user', 'secretaria', 'assistente')
);

CREATE POLICY atendimentos_user_insert ON public.atendimentos
FOR INSERT TO authenticated
WITH CHECK (
  coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('user', 'secretaria', 'assistente')
);

CREATE POLICY atendimentos_user_update ON public.atendimentos
FOR UPDATE TO authenticated
USING (
  coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('user', 'secretaria', 'assistente')
)
WITH CHECK (
  coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('user', 'secretaria', 'assistente')
);

-- Índice faltante
CREATE INDEX IF NOT EXISTS idx_atendimentos_client_id ON public.atendimentos(client_id);

-- 3. Gatilho Mágico (Type Match)
CREATE OR REPLACE FUNCTION public.handle_document_upload_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the document belongs to a client
  IF NEW.parent_type = 'client' THEN
    UPDATE public.atendimentos
    SET 
      status = 'Resolvido',
      detalhes = COALESCE(detalhes, '') || ' [Resolvido automaticamente via anexo de documento]'
    WHERE 
      client_id = NEW.parent_id::uuid 
      AND status = 'Pendente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
