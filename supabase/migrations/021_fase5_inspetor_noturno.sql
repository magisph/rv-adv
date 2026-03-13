-- =====================================================================
-- Fase 5: O Inspetor Noturno (Auditoria Contínua)
-- Author: Senior Data Architect
-- =====================================================================

-- Ajustar a tabela de notificações (herdada do PericiaPro) para aceitar os novos alertas
DO $$ 
BEGIN
    ALTER TABLE notifications ALTER COLUMN pericia_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- -------------------------------------------------------
-- FUNÇÃO: rvadv_nightly_audit()
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION rvadv_nightly_audit() 
RETURNS void AS $$
DECLARE
    v_admin RECORD;
    v_count_parados int;
    v_count_incompletos int;
BEGIN
    -- Obter os totais
    -- REGRA 1 (Processos Esquecidos)
    SELECT COUNT(*) INTO v_count_parados 
    FROM processes 
    WHERE status = 'ativo' AND last_move_date < (CURRENT_DATE - INTERVAL '6 months');

    -- REGRA 2 (Cadastros Incompletos)
    SELECT COUNT(*) INTO v_count_incompletos 
    FROM clients 
    WHERE cpf_cnpj IS NULL OR TRIM(cpf_cnpj) = '';

    -- Se não houver nada a alertar, sair cedo
    IF v_count_parados = 0 AND v_count_incompletos = 0 THEN
        RETURN;
    END IF;

    -- Inserir notificações para todos os administradores e donos
    FOR v_admin IN 
        SELECT auth_id FROM users WHERE role IN ('admin', 'dono') AND auth_id IS NOT NULL
    LOOP
        -- Alerta: Processos Parados
        IF v_count_parados > 0 THEN
            INSERT INTO notifications (user_id, type, priority, title, message)
            VALUES (
                v_admin.auth_id, 
                'alerta', 
                'importante', 
                'Processos Parados', 
                'Existem ' || v_count_parados || ' processos sem movimentação há mais de 6 meses.'
            );
        END IF;

        -- Alerta: Cadastros Incompletos
        IF v_count_incompletos > 0 THEN
            INSERT INTO notifications (user_id, type, priority, title, message)
            VALUES (
                v_admin.auth_id, 
                'sistema', 
                'informativa', 
                'Cadastros Incompletos', 
                'Existem ' || v_count_incompletos || ' clientes sem CPF/CNPJ cadastrado.'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------
-- AGENDAMENTO (pg_cron)
-- -------------------------------------------------------
DO $$
BEGIN
    PERFORM cron.unschedule('nightly-audit');
EXCEPTION
    WHEN others THEN NULL;
END $$;

SELECT cron.schedule('nightly-audit', '0 3 * * *', $$SELECT rvadv_nightly_audit()$$);
