-- ====================================================================
-- Migration: 20260330000000_audit_rls_security.sql
-- Description: Auditoria e ativação de RLS em tabelas críticas + validações.
-- Metodologia Defense-in-Depth
-- Fix: tabelas usam 'created_by' (não 'user_id') como campo de ownership.
--      Tabelas financial e benefits podem não existir — protegidas com DO $$.
-- ====================================================================

-- 1. Ativar RLS nas tabelas críticas (IF EXISTS garante idempotência)
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;

-- financial e benefits: ativar apenas se a tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial') THEN
    EXECUTE 'ALTER TABLE financial ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'benefits') THEN
    EXECUTE 'ALTER TABLE benefits ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 2. Políticas FAIL-CLOSE baseadas em created_by + role JWT
-- O campo de ownership no rv-adv é 'created_by', não 'user_id'.
-- Admins e advogados têm acesso irrestrito via claim JWT.

-- Clients
DROP POLICY IF EXISTS "Users can only access their own clients" ON clients;
CREATE POLICY "Users can only access their own clients" ON clients
    FOR ALL
    USING (
        auth.uid() = created_by
        OR coalesce(
            auth.jwt() ->> 'user_role',
            auth.jwt() ->> 'role'
        ) IN ('admin', 'advogado')
    )
    WITH CHECK (
        auth.uid() = created_by
        OR coalesce(
            auth.jwt() ->> 'user_role',
            auth.jwt() ->> 'role'
        ) IN ('admin', 'advogado')
    );

-- Processes
DROP POLICY IF EXISTS "Users can only access their own processes" ON processes;
CREATE POLICY "Users can only access their own processes" ON processes
    FOR ALL
    USING (
        auth.uid() = created_by
        OR coalesce(
            auth.jwt() ->> 'user_role',
            auth.jwt() ->> 'role'
        ) IN ('admin', 'advogado')
    )
    WITH CHECK (
        auth.uid() = created_by
        OR coalesce(
            auth.jwt() ->> 'user_role',
            auth.jwt() ->> 'role'
        ) IN ('admin', 'advogado')
    );

-- Documents
DROP POLICY IF EXISTS "Users can only access their own documents" ON documents;
CREATE POLICY "Users can only access their own documents" ON documents
    FOR ALL
    USING (
        auth.uid() = created_by
        OR coalesce(
            auth.jwt() ->> 'user_role',
            auth.jwt() ->> 'role'
        ) IN ('admin', 'advogado')
    )
    WITH CHECK (
        auth.uid() = created_by
        OR coalesce(
            auth.jwt() ->> 'user_role',
            auth.jwt() ->> 'role'
        ) IN ('admin', 'advogado')
    );

-- Financial e Benefits: criar policies apenas se as tabelas existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can only access their own financial records" ON financial';
    EXECUTE $pol$
      CREATE POLICY "Users can only access their own financial records" ON financial
        FOR ALL
        USING (
          auth.uid() = created_by
          OR coalesce(auth.jwt() ->> ''user_role'', auth.jwt() ->> ''role'') IN (''admin'', ''advogado'')
        )
        WITH CHECK (
          auth.uid() = created_by
          OR coalesce(auth.jwt() ->> ''user_role'', auth.jwt() ->> ''role'') IN (''admin'', ''advogado'')
        )
    $pol$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'benefits') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can only access their own benefits" ON benefits';
    EXECUTE $pol$
      CREATE POLICY "Users can only access their own benefits" ON benefits
        FOR ALL
        USING (
          auth.uid() = created_by
          OR coalesce(auth.jwt() ->> ''user_role'', auth.jwt() ->> ''role'') IN (''admin'', ''advogado'')
        )
        WITH CHECK (
          auth.uid() = created_by
          OR coalesce(auth.jwt() ->> ''user_role'', auth.jwt() ->> ''role'') IN (''admin'', ''advogado'')
        )
    $pol$;
  END IF;
END $$;

-- 3. Validação robusta de JSONB (dados_civeis) na tabela clients
-- Garante que o campo seja um JSON Object (não array, boolean ou null na raiz).
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS ck_clients_dados_civeis_is_object;

ALTER TABLE clients
  ADD CONSTRAINT ck_clients_dados_civeis_is_object
  CHECK (dados_civeis IS NULL OR jsonb_typeof(dados_civeis) = 'object');

-- ====================================================================
-- Fim da Migration
-- ====================================================================
