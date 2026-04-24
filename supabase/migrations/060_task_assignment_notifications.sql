-- =====================================================================
-- Migração 060: Trigger de Notificação para Delegação de Tarefas
-- Objetivo: Automatizar alertas quando uma tarefa com due_date é
--           atribuída/reatribuída via Kanban (admin → assistente)
-- Segurança: SECURITY DEFINER para contornar RLS ao inserir para outro user
-- =====================================================================

-- -------------------------------------------------------
-- STEP 1: Expandir a tabela notifications para suportar
--         o fluxo RV-Adv além do PericiaPro original
-- -------------------------------------------------------
DO $$
BEGIN
  -- Tornar pericia_id opcional (era NOT NULL no schema original)
  ALTER TABLE notifications ALTER COLUMN pericia_id DROP NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pericia_id já é nullable ou não existe: %', SQLERRM;
END;
$$;

-- Adicionar colunas ausentes com segurança (IF NOT EXISTS via bloco DO)
DO $$
BEGIN
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message text;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id uuid;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_date timestamptz;

  -- Expandir type para incluir tipos usados pelo RV-Adv
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('dcb','pericia','prazo','tarefa','compromisso','movimentacao','sistema','warning'));

  -- Expandir priority para incluir termos pt-BR usados pelo NotificationPanel
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check
    CHECK (priority IN ('low','medium','high','critical','urgente','importante','informativa','sucesso'));

EXCEPTION WHEN others THEN
  RAISE NOTICE 'Erro ao expandir schema de notifications: %', SQLERRM;
END;
$$;

-- -------------------------------------------------------
-- STEP 2: Garantir que notifications está na publicação
--         Realtime para que o frontend receba eventos WS
-- -------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- -------------------------------------------------------
-- STEP 3: Índice para filtro por user_id (Realtime filter + queries)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_related_id
  ON notifications(related_id);

-- -------------------------------------------------------
-- STEP 4: Função que gera a notificação de delegação
--         SECURITY DEFINER: executa como o dono da função
--         (contorna o RLS que impediria 'rafaela' de inserir
--          uma notificação para 'suzana')
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee_id   uuid;
  v_due_date_fmt  text;
  v_msg           text;
BEGIN
  -- Só executa se houver um responsável definido
  IF NEW.assigned_to IS NULL OR NEW.assigned_to = '' THEN
    RETURN NEW;
  END IF;

  -- Só executa se houve mudança de responsável OU se é um INSERT com responsável
  IF TG_OP = 'UPDATE' AND (OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to) THEN
    RETURN NEW;
  END IF;

  -- Resolver o auth.uid do responsável pelo e-mail armazenado em assigned_to
  SELECT id INTO v_assignee_id
  FROM auth.users
  WHERE email = NEW.assigned_to
  LIMIT 1;

  -- Se não encontrar o usuário, não falha — apenas não notifica
  IF v_assignee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Formatar data de vencimento
  IF NEW.due_date IS NOT NULL THEN
    v_due_date_fmt := TO_CHAR(NEW.due_date, 'DD/MM/YYYY');
    v_msg := format(
      '⚠️ Você recebeu a tarefa "%s" com vencimento em %s.',
      NEW.title,
      v_due_date_fmt
    );
  ELSE
    v_msg := format('⚠️ Você recebeu a tarefa "%s".', NEW.title);
  END IF;

  -- Inserir notificação diretamente (bypass RLS via SECURITY DEFINER)
  INSERT INTO notifications (
    user_id,
    type,
    priority,
    title,
    message,
    link,
    related_id,
    is_read,
    created_at
  ) VALUES (
    v_assignee_id,
    'warning',
    'importante',
    'Nova Tarefa Atribuída',
    v_msg,
    '/tasks',
    NEW.id,
    false,
    now()
  );

  RETURN NEW;

EXCEPTION WHEN others THEN
  -- Nunca deixar o trigger falhar a operação principal
  RAISE WARNING 'notify_task_assignment: erro ao notificar (ignorado): %', SQLERRM;
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------
-- STEP 5: Criar o trigger na tabela tasks
-- -------------------------------------------------------
DROP TRIGGER IF EXISTS trg_task_assignment_notification ON tasks;

CREATE TRIGGER trg_task_assignment_notification
  AFTER INSERT OR UPDATE OF assigned_to, due_date
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();

-- -------------------------------------------------------
-- STEP 6: Verificar/reforçar políticas RLS fail-close
--         Usuários só lêem/atualizam notificações próprias
-- -------------------------------------------------------

-- Remover política genérica antiga se existir (fail-close priority)
DROP POLICY IF EXISTS "notifications_own" ON notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Garantir RLS habilitado
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas as próprias notificações
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: apenas para si mesmo (o trigger usa SECURITY DEFINER, não precisa desta policy)
-- mas usuários autenticados podem inserir notificações para si mesmos
CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: marcar como lida (somente as próprias)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: excluir notificações próprias
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- -------------------------------------------------------
-- STEP 7: Comentários de documentação
-- -------------------------------------------------------
COMMENT ON FUNCTION notify_task_assignment IS
  'Trigger SECURITY DEFINER: Insere notificação de delegação de tarefa para o assignee.
   Executado após INSERT ou UPDATE em tasks quando assigned_to muda.
   Usa SECURITY DEFINER para contornar RLS (admin notifica assistente).
   Nunca falha a operação principal (EXCEPTION capturada).';

COMMENT ON TRIGGER trg_task_assignment_notification ON tasks IS
  'Aciona notify_task_assignment() após INSERT ou UPDATE de assigned_to/due_date em tasks.';
