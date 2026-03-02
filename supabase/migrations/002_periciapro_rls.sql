-- =====================================================================
-- PericiaPro Row Level Security Policies
-- Tradução de Base44 RLS declarativo → PostgreSQL RLS nativo
-- =====================================================================

-- -------------------------------------------------------
-- pericias: owner (created_by) pode gerenciar, admin pode ler tudo
-- -------------------------------------------------------
ALTER TABLE pericias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pericias_select_own_or_admin" ON pericias
  FOR SELECT USING (
    created_by = auth.uid()
  );

CREATE POLICY "pericias_insert_own" ON pericias
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "pericias_update_own" ON pericias
  FOR UPDATE USING (
    created_by = auth.uid()
  );

CREATE POLICY "pericias_delete_own" ON pericias
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- -------------------------------------------------------
-- pericia_pagamentos: segue a política da perícia pai
-- -------------------------------------------------------
ALTER TABLE pericia_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagamentos_via_pericia_owner" ON pericia_pagamentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_pagamentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------
-- pericia_documentos: segue a política da perícia pai
-- -------------------------------------------------------
ALTER TABLE pericia_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_via_pericia_owner" ON pericia_documentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = pericia_documentos.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------
-- activity_logs: owner da perícia pode gerenciar
-- -------------------------------------------------------
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_via_pericia_owner" ON activity_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pericias
      WHERE pericias.id = activity_logs.pericia_id
      AND pericias.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------
-- lembretes: owner (created_by) apenas
-- -------------------------------------------------------
ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lembretes_own" ON lembretes
  FOR ALL USING (
    created_by = auth.uid()
  );

-- -------------------------------------------------------
-- notifications: user_id owner apenas
-- -------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (
    user_id = auth.uid()
  );

-- -------------------------------------------------------
-- notification_preferences: user_id owner apenas
-- -------------------------------------------------------
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs_own" ON notification_preferences
  FOR ALL USING (
    user_id = auth.uid()
  );
