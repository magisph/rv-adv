-- =====================================================================
-- Migration: 019_fase4_tabela_feriados
-- Description: Criação da tabela holidays (Feriados) para o motor de cálculos.
-- =====================================================================

-- Extensão se não existir para o uuid_generate_v4() (já foi ativada antes mas garantimos)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    name TEXT,
    type TEXT CHECK (type IN ('nacional', 'estadual', 'municipal')),
    state TEXT,
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS holidays_select_policy ON holidays;
DROP POLICY IF EXISTS holidays_insert_policy ON holidays;
DROP POLICY IF EXISTS holidays_update_policy ON holidays;
DROP POLICY IF EXISTS holidays_delete_policy ON holidays;

-- SELECT liberado para 'authenticated'
CREATE POLICY holidays_select_policy ON holidays
FOR SELECT TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE restrito a roles 'admin' e 'dono'
CREATE POLICY holidays_insert_policy ON holidays
FOR INSERT TO authenticated
WITH CHECK (
    coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') IN ('admin', 'dono')
);

CREATE POLICY holidays_update_policy ON holidays
FOR UPDATE TO authenticated
USING (
    coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') IN ('admin', 'dono')
)
WITH CHECK (
    coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') IN ('admin', 'dono')
);

CREATE POLICY holidays_delete_policy ON holidays
FOR DELETE TO authenticated
USING (
    coalesce((SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1), 'user') IN ('admin', 'dono')
);
