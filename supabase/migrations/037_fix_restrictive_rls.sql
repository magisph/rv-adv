-- ==========================================
-- 037_fix_restrictive_rls.sql
-- Goal: Fix permissive RLS on critical tables
-- Description: Drops the permissive using(true) policies on clients and processes
-- and implements fail-close policies restricting to created_by or admin role.
-- ==========================================

-- 1. Clients Table Security (Fail-Close)
DROP POLICY IF EXISTS clients_select_policy ON clients;
DROP POLICY IF EXISTS clients_insert_policy ON clients;
DROP POLICY IF EXISTS clients_update_policy ON clients;
DROP POLICY IF EXISTS clients_delete_policy ON clients;

CREATE POLICY clients_select_policy ON clients FOR SELECT TO authenticated
USING (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY clients_insert_policy ON clients FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY clients_update_policy ON clients FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
)
WITH CHECK (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY clients_delete_policy ON clients FOR DELETE TO authenticated
USING (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);

-- 2. Processes Table Security (Fail-Close)
DROP POLICY IF EXISTS processes_select_policy ON processes;
DROP POLICY IF EXISTS processes_insert_policy ON processes;
DROP POLICY IF EXISTS processes_update_policy ON processes;
DROP POLICY IF EXISTS processes_delete_policy ON processes;

CREATE POLICY processes_select_policy ON processes FOR SELECT TO authenticated
USING (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY processes_insert_policy ON processes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY processes_update_policy ON processes FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
)
WITH CHECK (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY processes_delete_policy ON processes FOR DELETE TO authenticated
USING (
  auth.uid() = created_by OR (auth.jwt() ->> 'role')::text = 'admin'
);
