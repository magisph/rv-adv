-- =====================================================================
-- Migration 047: Visibilidade compartilhada de clientes
--
-- Requisito: Todos os usuários autenticados devem ver todos os
-- clientes, independentemente de quem realizou o cadastro.
--
-- Remove todas as políticas anteriores que filtravam por created_by
-- e recria políticas simples baseadas apenas em autenticação e role.
-- =====================================================================

-- ─── 1. Remove TODAS as políticas existentes na tabela clients ────────
DROP POLICY IF EXISTS "Users can only access their own clients" ON public.clients;
DROP POLICY IF EXISTS clients_select_policy    ON public.clients;
DROP POLICY IF EXISTS clients_insert_policy    ON public.clients;
DROP POLICY IF EXISTS clients_update_policy    ON public.clients;
DROP POLICY IF EXISTS clients_delete_policy    ON public.clients;

-- ─── 2. SELECT: qualquer usuário autenticado vê todos os clientes ─────
--    (apenas registros não excluídos via soft-delete)
CREATE POLICY clients_select_policy ON public.clients
FOR SELECT TO authenticated
USING (deleted_at IS NULL);

-- ─── 3. INSERT: qualquer usuário autenticado pode cadastrar clientes ──
CREATE POLICY clients_insert_policy ON public.clients
FOR INSERT TO authenticated
WITH CHECK (true);

-- ─── 4. UPDATE: qualquer usuário autenticado pode editar clientes ─────
CREATE POLICY clients_update_policy ON public.clients
FOR UPDATE TO authenticated
USING  (deleted_at IS NULL)
WITH CHECK (true);

-- ─── 5. DELETE (soft): apenas admin pode excluir clientes ─────────────
CREATE POLICY clients_delete_policy ON public.clients
FOR DELETE TO authenticated
USING (
  coalesce(
    auth.jwt() ->> 'user_role',
    auth.jwt() ->> 'role',
    (auth.jwt() -> 'user_metadata') ->> 'role'
  ) = 'admin'
);
