-- =====================================================================
-- pg_cron job para verificação diária de alertas de deadline
-- Executa às 08:00 todos os dias
-- =====================================================================

-- Função que verifica DCB e perícias próximas e gera notificações
CREATE OR REPLACE FUNCTION periciapro_check_deadline_alerts()
RETURNS void AS $$
DECLARE
  r RECORD;
  dias_restantes integer;
  alert_days integer[];
  d integer;
  pref RECORD;
BEGIN
  -- Percorrer todos as perícias com DCB ou data_pericia definidos
  FOR r IN 
    SELECT p.id, p.created_by, p.nome, p.cpf, p.dcb, p.data_pericia,
           p.horario_pericia, p.status, p.alerta_dcb_exibido,
           p.alertas_pericia_exibidos
    FROM pericias p
    WHERE (p.dcb IS NOT NULL OR (p.data_pericia IS NOT NULL AND p.status = 'Perícia Agendada'))
  LOOP
    -- Buscar preferências do usuário (ou usar defaults)
    SELECT * INTO pref 
    FROM notification_preferences 
    WHERE user_id = r.created_by 
    LIMIT 1;

    -- === Alertas de DCB ===
    IF r.dcb IS NOT NULL AND NOT COALESCE(r.alerta_dcb_exibido, false) THEN
      dias_restantes := (r.dcb - CURRENT_DATE);
      alert_days := COALESCE(pref.dcb_alert_days, ARRAY[15, 7, 3, 1]);
      
      FOREACH d IN ARRAY alert_days
      LOOP
        IF dias_restantes = d THEN
          -- Inserir notificação se não existir
          INSERT INTO notifications (user_id, pericia_id, pericia_nome, type, title, message, priority, days_until, event_date)
          SELECT r.created_by, r.id, r.nome, 'dcb',
                 'DCB em ' || d || ' dias - ' || r.nome,
                 'O benefício de ' || r.nome || ' será cessado em ' || d || ' dias.',
                 CASE WHEN d <= 3 THEN 'critical' WHEN d <= 7 THEN 'high' ELSE 'medium' END,
                 d, r.dcb
          WHERE NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.pericia_id = r.id AND n.type = 'dcb' AND n.days_until = d
          );
        END IF;
      END LOOP;
    END IF;

    -- === Alertas de Perícia ===
    IF r.data_pericia IS NOT NULL AND r.status = 'Perícia Agendada' THEN
      dias_restantes := (r.data_pericia - CURRENT_DATE);
      alert_days := COALESCE(pref.pericia_alert_days, ARRAY[45, 30, 15, 7, 3, 1]);
      
      FOREACH d IN ARRAY alert_days
      LOOP
        IF dias_restantes = d AND NOT (d = ANY(COALESCE(r.alertas_pericia_exibidos, ARRAY[]::integer[]))) THEN
          INSERT INTO notifications (user_id, pericia_id, pericia_nome, type, title, message, priority, days_until, event_date)
          SELECT r.created_by, r.id, r.nome, 'pericia',
                 'Perícia em ' || d || ' dias - ' || r.nome,
                 'Perícia de ' || r.nome || ' agendada para ' || to_char(r.data_pericia, 'DD/MM/YYYY') ||
                 CASE WHEN r.horario_pericia IS NOT NULL THEN ' às ' || to_char(r.horario_pericia, 'HH24:MI') ELSE '' END,
                 CASE WHEN d <= 1 THEN 'critical' WHEN d <= 7 THEN 'high' WHEN d <= 15 THEN 'medium' ELSE 'low' END,
                 d, r.data_pericia
          WHERE NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.pericia_id = r.id AND n.type = 'pericia' AND n.days_until = d
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendar via pg_cron (requer extensão habilitada no Supabase)
-- SELECT cron.schedule('periciapro-deadline-alerts', '0 8 * * *', $$SELECT periciapro_check_deadline_alerts()$$);
