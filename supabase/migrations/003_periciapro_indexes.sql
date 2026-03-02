-- =====================================================================
-- PericiaPro Indexes para queries frequentes
-- =====================================================================

-- pericias
CREATE INDEX IF NOT EXISTS idx_pericias_created_by ON pericias(created_by);
CREATE INDEX IF NOT EXISTS idx_pericias_status ON pericias(status);
CREATE INDEX IF NOT EXISTS idx_pericias_data_pericia ON pericias(data_pericia);
CREATE INDEX IF NOT EXISTS idx_pericias_dcb ON pericias(dcb);
CREATE INDEX IF NOT EXISTS idx_pericias_updated_at ON pericias(updated_at DESC);

-- pericia_pagamentos
CREATE INDEX IF NOT EXISTS idx_pagamentos_pericia_id ON pericia_pagamentos(pericia_id);

-- pericia_documentos
CREATE INDEX IF NOT EXISTS idx_documentos_pericia_id ON pericia_documentos(pericia_id);

-- activity_logs
CREATE INDEX IF NOT EXISTS idx_logs_pericia_id_created ON activity_logs(pericia_id, created_at DESC);

-- lembretes
CREATE INDEX IF NOT EXISTS idx_lembretes_pericia_id ON lembretes(pericia_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_data ON lembretes(data_lembrete);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_pericia_type ON notifications(pericia_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- notification_preferences
CREATE INDEX IF NOT EXISTS idx_prefs_user_id ON notification_preferences(user_id);
