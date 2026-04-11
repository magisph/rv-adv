-- 057_atendimentos_full_crud_all_users.sql
--
-- Objetivo: Conceder permissão integral de CRUD (SELECT, INSERT, UPDATE, DELETE)
--           a TODOS os utilizadores autenticados na tabela 'atendimentos'.
--
-- Contexto:
--   As migrações 054 e 055 restringiam UPDATE e DELETE apenas a admin/dono
--   ou ao criador do registo (created_by = auth.uid()).
--   A pedido do negócio, todos os utilizadores autenticados devem poder
--   gerir atendimentos de forma plena e integral.
--
-- Segurança:
--   O RLS continua ATIVO. A abertura é intencional e restrita à role
--   'authenticated' do Supabase — utilizadores anónimos não têm acesso.
--   O trigger 'set_atendimentos_created_by' é preservado para auditoria.
--
-- Performance (Supabase Postgres Best Practices — security-rls):
--   Adicionamos índice em 'created_at' para suportar a nova feature de
--   visualização diária (filtro por data no DiarioAtendimentosWidget).

-- ============================================================
-- PASSO 1: Remover políticas granulares anteriores
-- ============================================================
DROP POLICY IF EXISTS "atendimentos_select_policy"        ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_insert_policy"        ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_update_policy"        ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_delete_policy"        ON public.atendimentos;
DROP POLICY IF EXISTS "atendimentos_admin_manager_policy" ON public.atendimentos;

-- ============================================================
-- PASSO 2: Garantir que o RLS está activo
-- ============================================================
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASSO 3: Criar política única de CRUD total para autenticados
-- ============================================================
-- Usando uma única política FOR ALL é mais eficiente do que
-- quatro políticas separadas, pois o planeador do Postgres
-- avalia apenas uma expressão por operação.
CREATE POLICY "atendimentos_full_crud_authenticated"
ON public.atendimentos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- PASSO 4: Índice em 'created_at' para a visualização diária
-- ============================================================
-- Suporta queries do tipo: WHERE DATE(created_at) = '2026-04-11'
-- usadas pelo DiarioAtendimentosWidget ao clicar num dia específico.
CREATE INDEX IF NOT EXISTS idx_atendimentos_created_at
ON public.atendimentos (created_at DESC);

-- ============================================================
-- RESUMO das políticas resultantes:
-- ============================================================
-- atendimentos_full_crud_authenticated -> ALL: authenticated (qualquer utilizador autenticado)
-- Trigger: set_atendimentos_created_by -> Preservado para auditoria (auto-preenche created_by)
-- Índice: idx_atendimentos_created_by  -> Preservado (performance RLS de auditoria)
-- Índice: idx_atendimentos_created_at  -> NOVO (performance da visualização diária)
-- ============================================================
