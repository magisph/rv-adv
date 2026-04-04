-- ==========================================
-- 044_fix_rls_jwt_claims.sql
-- Goal: Unify JWT role claims in all RLS policies
--
-- Problem: Migrations 037 and 039 used (auth.jwt() ->> 'role') while
-- migrations 006, 018, 020 and others use (auth.jwt() ->> 'user_role').
-- The actual claim set in app_metadata (migrations 028/029) is 'user_role'.
-- Using 'role' in Supabase JWT refers to the built-in Postgres role
-- (e.g., 'authenticated'), NOT the application role.
--
-- Fix: Replace (auth.jwt() ->> 'role') with a COALESCE that checks
-- 'user_role' first (app_metadata), then 'role' as fallback.
-- This ensures backward compatibility during the transition.
-- ==========================================

-- ─── 1. clients table (overrides 037 + 039) ─────────────────────────

DROP POLICY IF EXISTS clients_select_policy ON public.clients;
DROP POLICY IF EXISTS clients_insert_policy ON public.clients;
DROP POLICY IF EXISTS clients_update_policy ON public.clients;
DROP POLICY IF EXISTS clients_delete_policy ON public.clients;

CREATE POLICY clients_select_policy ON public.clients
FOR SELECT TO authenticated
USING (
  (
    auth.uid() = created_by
    OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
  )
  AND deleted_at IS NULL
);

CREATE POLICY clients_insert_policy ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY clients_update_policy ON public.clients
FOR UPDATE TO authenticated
USING (
  (
    auth.uid() = created_by
    OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  (
    auth.uid() = created_by
    OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
  )
  AND deleted_at IS NULL
);

CREATE POLICY clients_delete_policy ON public.clients
FOR DELETE TO authenticated
USING (
  (
    auth.uid() = created_by
    OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
  )
  AND deleted_at IS NULL
);

-- ─── 2. processes table (overrides 037) ─────────────────────────────

DROP POLICY IF EXISTS processes_select_policy ON public.processes;
DROP POLICY IF EXISTS processes_insert_policy ON public.processes;
DROP POLICY IF EXISTS processes_update_policy ON public.processes;
DROP POLICY IF EXISTS processes_delete_policy ON public.processes;

CREATE POLICY processes_select_policy ON public.processes
FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY processes_insert_policy ON public.processes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY processes_update_policy ON public.processes
FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.uid() = created_by
  OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY processes_delete_policy ON public.processes
FOR DELETE TO authenticated
USING (
  auth.uid() = created_by
  OR coalesce(auth.jwt() ->> 'user_role', auth.jwt() ->> 'role') = 'admin'
);
