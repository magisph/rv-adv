-- =====================================================================
-- Migration: 020_fase4_feriados_rls_fix
-- Description: Refatorar as políticas da tabela holidays para melhor performance (usando jwt cache)
-- =====================================================================

DROP POLICY IF EXISTS holidays_insert_policy ON holidays;
DROP POLICY IF EXISTS holidays_update_policy ON holidays;
DROP POLICY IF EXISTS holidays_delete_policy ON holidays;

CREATE POLICY holidays_insert_policy ON holidays
FOR INSERT TO authenticated
WITH CHECK (
    coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono')
);

CREATE POLICY holidays_update_policy ON holidays
FOR UPDATE TO authenticated
USING (
    coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono')
)
WITH CHECK (
    coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono')
);

CREATE POLICY holidays_delete_policy ON holidays
FOR DELETE TO authenticated
USING (
    coalesce(auth.jwt() ->> 'user_role', 'guest') IN ('admin', 'dono')
);
