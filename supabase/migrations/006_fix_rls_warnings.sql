-- =====================================================================
-- Migration 006: Fix RLS policy warnings
-- Adds WITH CHECK clauses + admin role bypass
-- =====================================================================

-- -------------------------------------------------------
-- 1. Admin bypass on pericias (fix: "own_or_admin" name but no admin logic)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "pericias_select_own_or_admin" ON pericias;
DROP POLICY IF EXISTS "pericias_insert_own" ON pericias;
DROP POLICY IF EXISTS "pericias_update_own" ON pericias;
DROP POLICY IF EXISTS "pericias_delete_own" ON pericias;

-- SELECT: owner OR admin
CREATE POLICY "pericias_select_own_or_admin" ON pericias
  FOR SELECT USING (
    created_by = auth.uid()
    OR (auth.jwt() ->> 'user_role') = 'admin'
  );

-- INSERT: owner only, enforce created_by = auth.uid()
CREATE POLICY "pericias_insert_own" ON pericias
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- UPDATE: owner OR admin
CREATE POLICY "pericias_update_own_or_admin" ON pericias
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (auth.jwt() ->> 'user_role') = 'admin'
  ) WITH CHECK (
    created_by = auth.uid()
    OR (auth.jwt() ->> 'user_role') = 'admin'
  );

-- DELETE: owner OR admin
CREATE POLICY "pericias_delete_own_or_admin" ON pericias
  FOR DELETE USING (
    created_by = auth.uid()
    OR (auth.jwt() ->> 'user_role') = 'admin'
  );

-- -------------------------------------------------------
-- 2. pericia_pagamentos: add WITH CHECK
-- -------------------------------------------------------
DROP POLICY IF EXISTS "pagamentos_via_pericia_owner" ON pericia_pagamentos;

CREATE POLICY "pagamentos_select_via_owner" ON pericia_pagamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_pagamentos.pericia_id
      AND (pericias.created_by = auth.uid() OR (auth.jwt() ->> 'user_role') = 'admin')
    )
  );

CREATE POLICY "pagamentos_insert_via_owner" ON pericia_pagamentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_pagamentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

CREATE POLICY "pagamentos_update_via_owner" ON pericia_pagamentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_pagamentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_pagamentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

CREATE POLICY "pagamentos_delete_via_owner" ON pericia_pagamentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_pagamentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 3. pericia_documentos: add WITH CHECK
-- -------------------------------------------------------
DROP POLICY IF EXISTS "documentos_via_pericia_owner" ON pericia_documentos;

CREATE POLICY "documentos_select_via_owner" ON pericia_documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_documentos.pericia_id
      AND (pericias.created_by = auth.uid() OR (auth.jwt() ->> 'user_role') = 'admin')
    )
  );

CREATE POLICY "documentos_insert_via_owner" ON pericia_documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_documentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

CREATE POLICY "documentos_update_via_owner" ON pericia_documentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_documentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_documentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

CREATE POLICY "documentos_delete_via_owner" ON pericia_documentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_documentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 4. activity_logs: add WITH CHECK
-- -------------------------------------------------------
DROP POLICY IF EXISTS "logs_via_pericia_owner" ON activity_logs;

CREATE POLICY "logs_select_via_owner" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = activity_logs.pericia_id
      AND (pericias.created_by = auth.uid() OR (auth.jwt() ->> 'user_role') = 'admin')
    )
  );

CREATE POLICY "logs_insert_via_owner" ON activity_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = activity_logs.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

CREATE POLICY "logs_delete_via_owner" ON activity_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = activity_logs.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 5. lembretes: add WITH CHECK enforcing created_by
-- -------------------------------------------------------
DROP POLICY IF EXISTS "lembretes_own" ON lembretes;

CREATE POLICY "lembretes_select_own" ON lembretes
  FOR SELECT USING (
    created_by = auth.uid()
  );

CREATE POLICY "lembretes_insert_own" ON lembretes
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "lembretes_update_own" ON lembretes
  FOR UPDATE USING (
    created_by = auth.uid()
  ) WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "lembretes_delete_own" ON lembretes
  FOR DELETE USING (
    created_by = auth.uid()
  );
