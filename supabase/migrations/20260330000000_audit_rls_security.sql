-- ====================================================================
-- Migration: 20260330000000_audit_rls_security.sql
-- Description: Auditoria e ativação de RLS em tabelas críticas + validações.
-- Metodologia Defense-in-Depth
-- ====================================================================

-- 1. Ativar RLS nas tabelas críticas
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS benefits ENABLE ROW LEVEL SECURITY;

-- 2. Políticas FAIL-CLOSE baseadas no ID do usuário da sessão JWT
-- (Apenas usuários autenticados com auth.uid() válido podem selecionar/inserir/modificar os dados)
-- Política de 'ALL' pode ser quebrada em SELECT/INSERT/UPDATE/DELETE conforme necessidade, 
-- mas usaremos uma de segurança baseada em owner. No RV_Adv, os registros devem ser do usuário.

-- Clients
DROP POLICY IF EXISTS "Users can only access their own clients" ON clients;
CREATE POLICY "Users can only access their own clients" ON clients
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Processes
DROP POLICY IF EXISTS "Users can only access their own processes" ON processes;
CREATE POLICY "Users can only access their own processes" ON processes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Financial
DROP POLICY IF EXISTS "Users can only access their own financial records" ON financial;
CREATE POLICY "Users can only access their own financial records" ON financial
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Documents
DROP POLICY IF EXISTS "Users can only access their own documents" ON documents;
CREATE POLICY "Users can only access their own documents" ON documents
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Benefits
DROP POLICY IF EXISTS "Users can only access their own benefits" ON benefits;
CREATE POLICY "Users can only access their own benefits" ON benefits
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Validação robusta de JSONB (dados_civeis) na Tabela clients
-- Garantir que não contenha valores nulos indesejados e que seja de fato um JSON Object (tipo booleano, null, ou array na raiz serão rejeitados, deve ser um json formatação de object).
ALTER TABLE clients 
  DROP CONSTRAINT IF EXISTS ck_clients_dados_civeis_is_object;

ALTER TABLE clients
  ADD CONSTRAINT ck_clients_dados_civeis_is_object 
  CHECK (jsonb_typeof(dados_civeis) = 'object');

-- ====================================================================
-- Fim da Migration
-- ====================================================================
