-- ============================================================================
-- Migration 052: Histórico de Conversas e Memória — Chat Jurídico
-- Skill: supabase-postgres-best-practices (RLS estrita, CASCADE, IF NOT EXISTS)
-- Cria:
--   - public.jurisprudencia_chat_sessions  (Tabela A — Sessões)
--   - public.jurisprudencia_chat_messages  (Tabela B — Mensagens)
-- Segurança:
--   - RLS RESTRICTIVA: sem policy = negado por padrão
--   - Isolamento total por usuário via auth.uid()
--   - CASCADE DELETE: user → sessions → messages
-- ============================================================================

-- ─── Tabela A: jurisprudencia_chat_sessions ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jurisprudencia_chat_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Nova conversa',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.jurisprudencia_chat_sessions IS
  'Sessões de chat do módulo de Jurisprudência TNU. Cada linha representa uma conversa persistida de um usuário autenticado.';

COMMENT ON COLUMN public.jurisprudencia_chat_sessions.title IS
  'Título gerado automaticamente a partir das primeiras palavras da primeira mensagem do usuário.';

-- ─── Tabela B: jurisprudencia_chat_messages ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jurisprudencia_chat_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID        NOT NULL
                      REFERENCES public.jurisprudencia_chat_sessions(id)
                      ON DELETE CASCADE,
  role              TEXT        NOT NULL
                      CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT        NOT NULL,
  prompt_tokens     INTEGER     CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens INTEGER     CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.jurisprudencia_chat_messages IS
  'Mensagens individuais de cada sessão de chat jurídico. Gravadas em pares (user + assistant) após cada resposta do LLM.';

COMMENT ON COLUMN public.jurisprudencia_chat_messages.role IS
  'Papel da mensagem no diálogo: user (pergunta), assistant (resposta LLM), system (instrução de sistema).';

COMMENT ON COLUMN public.jurisprudencia_chat_messages.prompt_tokens IS
  'Tokens consumidos no prompt de entrada (metadado de billing/observabilidade).';

COMMENT ON COLUMN public.jurisprudencia_chat_messages.completion_tokens IS
  'Tokens gerados na resposta do LLM (metadado de billing/observabilidade).';

-- ─── Trigger: updated_at automático em sessions ───────────────────────────────
-- Mantém updated_at sincronizado sempre que uma mensagem nova é inserida ou
-- a sessão é atualizada diretamente (padrão do projeto).

CREATE OR REPLACE FUNCTION public.set_chat_session_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON public.jurisprudencia_chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON public.jurisprudencia_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_chat_session_updated_at();

-- Trigger em messages para atualizar updated_at da sessão pai ao inserir mensagem
CREATE OR REPLACE FUNCTION public.bump_chat_session_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.jurisprudencia_chat_sessions
     SET updated_at = NOW()
   WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_messages_bump_session ON public.jurisprudencia_chat_messages;
CREATE TRIGGER trg_chat_messages_bump_session
  AFTER INSERT ON public.jurisprudencia_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_chat_session_updated_at();

-- ─── Índices de Performance ───────────────────────────────────────────────────

-- Painel lateral: listar sessões de um usuário, mais recentes primeiro
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON public.jurisprudencia_chat_sessions (user_id, updated_at DESC);

-- Carregar mensagens de uma sessão em ordem cronológica
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON public.jurisprudencia_chat_messages (session_id, created_at ASC);

-- ─── RLS: Row Level Security Rigorosa ────────────────────────────────────────
-- Sem policy = acesso NEGADO por padrão (modo RESTRICTIVO).
-- Apenas o dono da sessão pode operar seus dados.

ALTER TABLE public.jurisprudencia_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisprudencia_chat_messages ENABLE ROW LEVEL SECURITY;

-- Sessions: acesso total ao próprio dono
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisprudencia_chat_sessions'
      AND policyname = 'sessions_owner_select'
  ) THEN
    CREATE POLICY "sessions_owner_select"
      ON public.jurisprudencia_chat_sessions
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisprudencia_chat_sessions'
      AND policyname = 'sessions_owner_insert'
  ) THEN
    CREATE POLICY "sessions_owner_insert"
      ON public.jurisprudencia_chat_sessions
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisprudencia_chat_sessions'
      AND policyname = 'sessions_owner_update'
  ) THEN
    CREATE POLICY "sessions_owner_update"
      ON public.jurisprudencia_chat_sessions
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisprudencia_chat_sessions'
      AND policyname = 'sessions_owner_delete'
  ) THEN
    CREATE POLICY "sessions_owner_delete"
      ON public.jurisprudencia_chat_sessions
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Messages: acesso apenas para mensagens de sessões próprias do usuário
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisprudencia_chat_messages'
      AND policyname = 'messages_owner_select'
  ) THEN
    CREATE POLICY "messages_owner_select"
      ON public.jurisprudencia_chat_messages
      FOR SELECT TO authenticated
      USING (
        session_id IN (
          SELECT id FROM public.jurisprudencia_chat_sessions
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jurisprudencia_chat_messages'
      AND policyname = 'messages_owner_insert'
  ) THEN
    CREATE POLICY "messages_owner_insert"
      ON public.jurisprudencia_chat_messages
      FOR INSERT TO authenticated
      WITH CHECK (
        session_id IN (
          SELECT id FROM public.jurisprudencia_chat_sessions
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- ─── Verificação pós-migration ────────────────────────────────────────────────
-- Execute as queries abaixo para confirmar o sucesso da migration:
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name LIKE 'jurisprudencia_chat%';
--
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename LIKE 'jurisprudencia_chat%';
--
-- SELECT policyname, tablename, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename LIKE 'jurisprudencia_chat%';
--
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename LIKE 'jurisprudencia_chat%';
