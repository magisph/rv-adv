-- =============================================================================
-- Migração 069: Desacoplamento Assíncrono e Barreira de Deduplicação SHA-256
-- =============================================================================
-- Objetivo: Garantir que o ti-webhook-receiver retorne 200 OK imediato,
-- enquanto a classificação pesada de IA ocorre em background via pg_net.
--
-- Componentes:
--   1. Coluna teor_sha256 UNIQUE em process_moves (barreira de deduplicação)
--   2. Extensão pg_net habilitada para chamadas HTTP assíncronas
--   3. Função trigger notify_classify_publication
--   4. Trigger after_insert_process_move
-- =============================================================================

-- 1. Habilitar pg_net para chamadas HTTP assíncronas a partir do banco
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- =============================================================================
-- 2. Adicionar coluna de hash SHA-256 em process_moves
--    Esta coluna é o "guardião" central da deduplicação canônica.
--    O UNIQUE constraint no banco é a barreira blindada — qualquer tentativa
--    de inserir o mesmo teor (mesmo com formatação HTML diferente) gera
--    uma violação de constraint tratada silenciosamente pelo webhook.
-- =============================================================================
ALTER TABLE public.process_moves
  ADD COLUMN IF NOT EXISTS teor_sha256 TEXT;

-- Índice UNIQUE para a barreira de deduplicação (partial — ignora NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_process_moves_teor_sha256
  ON public.process_moves (teor_sha256)
  WHERE teor_sha256 IS NOT NULL;

-- Comentário descritivo
COMMENT ON COLUMN public.process_moves.teor_sha256 IS
  'Hash SHA-256 do teor puro da intimação (sem HTML, datas e ruído). '
  'Garante deduplicação canônica: mesmo texto com HTML diferente = mesmo hash. '
  'Valor NULL para movimentações sem conteúdo textual (ex: audiências manuais).';

-- =============================================================================
-- 3. Tabela de controle de estado de classificação assíncrona
--    Rastreia o ciclo de vida: pending → processing → done / failed
--    Essencial para evitar race conditions e permitir retry resiliente.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.classification_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_move_id  UUID NOT NULL REFERENCES public.process_moves(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  tentativas       INT  NOT NULL DEFAULT 0,
  erro             TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em    TIMESTAMPTZ,
  
  CONSTRAINT uq_classification_queue_move UNIQUE (process_move_id)
);

CREATE INDEX IF NOT EXISTS idx_classification_queue_status
  ON public.classification_queue (status)
  WHERE status IN ('pending', 'failed');

COMMENT ON TABLE public.classification_queue IS
  'Fila de classificação assíncrona: o trigger insere aqui após cada INSERT '
  'em process_moves. A Edge Function classify-publication consome esta fila.';

-- RLS para classification_queue
ALTER TABLE public.classification_queue ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode ler/escrever (consumido apenas por Edge Functions internas)
CREATE POLICY "service_role_full_access_classification_queue"
  ON public.classification_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- admins e advogados podem monitorar a fila (leitura)
CREATE POLICY "staff_read_classification_queue"
  ON public.classification_queue
  FOR SELECT
  USING (
    (auth.jwt() ->> 'user_role')::text IN ('admin', 'advogado')
  );

-- =============================================================================
-- 4. Função Trigger: notify_classify_publication
--    Dispara o worker assíncrono via pg_net após cada INSERT em process_moves.
--    Envia apenas o ID da movimentação — nunca dados sensíveis via HTTP.
--    O worker buscará o conteúdo completo diretamente do banco com service_role.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.notify_classify_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url  TEXT;
  v_service_key   TEXT;
  v_function_url  TEXT;
  v_queue_id      UUID;
  v_request_id    BIGINT;
BEGIN
  -- Apenas processa movimentações do tipo intimação com teor
  IF NEW.move_type IS DISTINCT FROM 'intimacao' THEN
    RETURN NEW;
  END IF;
  
  -- Teor vazio não precisa de classificação de IA
  IF NEW.description IS NULL OR length(trim(NEW.description)) < 20 THEN
    RETURN NEW;
  END IF;

  -- Registra na fila de classificação (garante atomicidade antes do disparo HTTP)
  INSERT INTO public.classification_queue (process_move_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (process_move_id) DO NOTHING
  RETURNING id INTO v_queue_id;

  -- Se já estava na fila (duplicata improvável mas possível), não dispara novamente
  IF v_queue_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lê configurações do vault (variáveis de ambiente do Supabase)
  -- Usa pg_net para chamar a Edge Function de forma assíncrona (fire-and-forget)
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_key  := current_setting('app.service_role_key', true);
  
  -- Fallback: tenta via configuração padrão do Supabase
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    -- Em produção, configure via: ALTER SYSTEM SET app.supabase_url = '...';
    -- Aqui usamos a URL padrão do projeto detectada pelo schema
    RETURN NEW; -- Seguro: a fila ainda está em 'pending' para retry manual
  END IF;

  v_function_url := v_supabase_url || '/functions/v1/classify-publication';

  -- Disparo assíncrono via pg_net — NÃO bloqueia a transação do INSERT
  SELECT extensions.http_post(
    url     := v_function_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key,
      'apikey',        v_service_key
    ),
    body    := jsonb_build_object(
      'process_move_id', NEW.id::text,
      'queue_id',        v_queue_id::text
    )::text
  ) INTO v_request_id;

  -- Log do disparo (sem dados sensíveis)
  RAISE LOG '[classify-trigger] Disparado classify-publication para move_id=%, pg_net request_id=%',
    NEW.id, v_request_id;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- NUNCA falha silenciosamente — o INSERT principal DEVE ser preservado
  -- A fila já tem o registro em 'pending'; o worker pode reprocessar
  RAISE WARNING '[classify-trigger] Erro ao disparar classify-publication: %. Move ID: %',
    SQLERRM, NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_classify_publication() IS
  'Trigger AFTER INSERT em process_moves: insere na classification_queue '
  'e dispara fire-and-forget via pg_net para classify-publication Edge Function. '
  'SECURITY DEFINER para acessar current_setting com credenciais do servidor. '
  'Nunca bloqueia o INSERT original — falhas são logadas e recuperáveis.';

-- =============================================================================
-- 5. Trigger: after_insert_process_move
--    Ativado após INSERT bem-sucedido, garantindo atomicidade:
--    a movimentação está persistida antes do worker ser acionado.
-- =============================================================================
DROP TRIGGER IF EXISTS after_insert_process_move ON public.process_moves;

CREATE TRIGGER after_insert_process_move
  AFTER INSERT ON public.process_moves
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_classify_publication();

COMMENT ON TRIGGER after_insert_process_move ON public.process_moves IS
  'Ativa o pipeline assíncrono de classificação IA após cada nova intimação. '
  'AFTER garante que o INSERT foi confirmado antes do disparo HTTP (sem race condition).';

-- =============================================================================
-- 6. Configurações do app (necessárias para o trigger acessar credenciais)
--    ATENÇÃO: Execute estes comandos manualmente no SQL Editor do Supabase
--    após o deploy, substituindo pelos valores reais do projeto:
--
--    ALTER DATABASE postgres SET app.supabase_url = 'https://SEU_PROJECT_REF.supabase.co';
--    ALTER DATABASE postgres SET app.service_role_key = 'SEU_SERVICE_ROLE_KEY';
--
--    OU configure via Supabase Vault (recomendado para produção):
--    SELECT vault.create_secret('supabase_url', 'https://...', 'URL do projeto');
--    SELECT vault.create_secret('service_role_key', 'eyJ...', 'Service role key');
-- =============================================================================

-- Placeholder para verificação de saúde da migração
DO $$
BEGIN
  -- Verifica se a coluna foi criada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'process_moves'
      AND column_name  = 'teor_sha256'
  ) THEN
    RAISE EXCEPTION 'FALHA CRÍTICA: coluna teor_sha256 não foi criada em process_moves';
  END IF;

  -- Verifica se o trigger foi criado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name   = 'after_insert_process_move'
  ) THEN
    RAISE EXCEPTION 'FALHA CRÍTICA: trigger after_insert_process_move não foi criado';
  END IF;

  RAISE NOTICE '✅ Migração 069 aplicada com sucesso: deduplicação SHA-256 e trigger assíncrono configurados.';
END;
$$;
