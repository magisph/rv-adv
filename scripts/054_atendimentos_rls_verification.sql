/**
 * 054_atendimentos_rls_verification.sql
 * 
 * Script de verificação manual das políticas RLS para a tabela atendimentos.
 * Execute via: psql ou Supabase Dashboard SQL Editor
 * 
 * Cenários de teste:
 * [ ] INSERT por usuário comum deve funcionar
 * [ ] INSERT por usuário anônimo deve falhar (403)
 * [ ] SELECT por usuário comum deve funcionar
 * [ ] UPDATE por usuário comum em registro próprio deve funcionar
 * [ ] UPDATE por usuário comum em registro de outro deve falhar (403)
 * [ ] UPDATE por admin deve funcionar
 * [ ] DELETE por usuário comum em registro próprio deve funcionar
 * [ ] DELETE por usuário comum em registro de outro deve falhar (403)
 * [ ] DELETE por admin deve funcionar
 */

-- ============================================
-- VERIFICAÇÃO 1: Listar políticas atuais
-- ============================================
SELECT 
    schemaname,
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'atendimentos'
ORDER BY policyname;

-- ============================================
-- VERIFICAÇÃO 2: Verificar se a política FOR ALL foi removida
-- ============================================
-- Deve retornar 0 linhas para cmd='all'
SELECT COUNT(*) as policies_with_for_all
FROM pg_policies 
WHERE tablename = 'atendimentos' 
AND cmd = 'all';

-- Resultado esperado: 0 (zero)

-- ============================================
-- VERIFICAÇÃO 3: Contar políticas por tipo de operação
-- ============================================
SELECT 
    cmd,
    COUNT(*) as policy_count,
    ARRAY_AGG(policyname) as policy_names
FROM pg_policies 
WHERE tablename = 'atendimentos'
GROUP BY cmd
ORDER BY cmd;

-- Resultado esperado:
-- cmd=INSERT -> 1 (atendimentos_insert_policy)
-- cmd=SELECT -> 1 (atendimentos_select_policy)
-- cmd=UPDATE -> 1 (atendimentos_update_policy)
-- cmd=DELETE -> 1 (atendimentos_delete_policy)
-- cmd=all    -> 0 (NENHUMA!)

-- ============================================
-- VERIFICAÇÃO 4: Simular INSERT (em contexto de serviço/anon)
-- ============================================
-- NOTA: Execute em uma sessão com anon ou jwt simulando usuário comum

/*
-- Simular INSERT (com service_role para bypass RLS durante teste)
-- Em produção, teste via Dashboard com um usuário non-admin
INSERT INTO public.atendimentos (
    nome_contato, 
    telefone, 
    categoria, 
    assunto, 
    detalhes, 
    status, 
    client_id,
    created_by
) VALUES (
    'TESTE_RLS_' || NOW(), 
    '11999998888', 
    'Prospecto', 
    'Verificação RLS 054',
    'Teste automatizado de política RLS',
    'Pendente',
    NULL,
    auth.uid()  -- O sistema deve preencher automaticamente se trigger existir
)
RETURNING id, nome_contato, created_by;

-- Se chegou até aqui, o INSERT foi bem-sucedido!
*/

-- ============================================
-- VERIFICAÇÃO 5: Checar se existe trigger para auto-fill created_by
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
AND event_object_table = 'atendimentos';

-- ============================================
-- VERIFICAÇÃO 6: Índices na tabela (para performance RLS)
-- ============================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'atendimentos';

-- Resultado esperado: índice em created_by para performance RLS
