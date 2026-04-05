-- =====================================================================
-- Migration 045: Módulo de Jurisprudência Semântica (pgvector)
-- Recria public.courts e public.jurisprudences (dropadas em 014)
-- com suporte a busca vetorial (HNSW), FTS e Storage bucket.
-- Skill: supabase-postgres-best-practices
-- =====================================================================

-- 1. Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Tabela: public.courts ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.courts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  acronym     TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS em courts
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_courts"
  ON public.courts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Tabela: public.jurisprudences ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.jurisprudences (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id              UUID          REFERENCES public.courts(id) ON DELETE CASCADE,
  process_number        TEXT,
  publication_date      DATE,
  trial_date            DATE,
  relator               TEXT,
  tema                  TEXT,
  excerpt               TEXT,
  full_text             TEXT,
  relevance_score       TEXT,
  fts_vector            TSVECTOR,
  -- Colunas vetoriais e de controle de indexação
  embedding             vector(768),  -- Gemini embedding-001 (768 dims)
  pdf_path              TEXT,
  json_extracted_path   TEXT,
  embedding_status      VARCHAR(20)   DEFAULT 'pending'
                          CHECK (embedding_status IN ('pending','processing','completed','failed')),
  first_indexed_at      TIMESTAMPTZ   DEFAULT NOW(),
  last_updated_at       TIMESTAMPTZ   DEFAULT NOW(),
  created_at            TIMESTAMPTZ   DEFAULT NOW()
);

-- RLS em jurisprudences
ALTER TABLE public.jurisprudences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_jurisprudences"
  ON public.jurisprudences
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Trigger FTS (recriado após DROP CASCADE em 014) ─────────────────────────

CREATE OR REPLACE FUNCTION public.update_jurisprudence_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts_vector := to_tsvector(
    'portuguese',
    coalesce(NEW.excerpt, '') || ' ' || coalesce(NEW.full_text, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jurisprudences_fts_update ON public.jurisprudences;
CREATE TRIGGER trg_jurisprudences_fts_update
  BEFORE INSERT OR UPDATE OF excerpt, full_text
  ON public.jurisprudences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jurisprudence_fts();

-- Trigger para atualizar last_updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_jurisprudence_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jurisprudences_updated_at ON public.jurisprudences;
CREATE TRIGGER trg_jurisprudences_updated_at
  BEFORE UPDATE ON public.jurisprudences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_jurisprudence_updated_at();

-- ─── Índices de Performance ───────────────────────────────────────────────────

-- GIN para Full-Text Search
CREATE INDEX IF NOT EXISTS idx_jurisprudences_fts
  ON public.jurisprudences USING GIN (fts_vector);

-- HNSW para busca vetorial (partial: só indexa linhas com embedding)
-- HNSW não requer dados pré-existentes e é mais preciso que IVFFlat
CREATE INDEX IF NOT EXISTS idx_jurisprudences_embedding
  ON public.jurisprudences USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- FK index em court_id
CREATE INDEX IF NOT EXISTS idx_jurisprudences_court_id
  ON public.jurisprudences (court_id);

-- Partial index para worker de embeddings (só pendentes)
CREATE INDEX IF NOT EXISTS idx_jurisprudences_embedding_pending
  ON public.jurisprudences (id)
  WHERE embedding_status = 'pending';

-- Index para ordenação por data de publicação
CREATE INDEX IF NOT EXISTS idx_jurisprudences_publication_date
  ON public.jurisprudences (publication_date DESC);

-- ─── RPC: buscar_jurisprudencia ───────────────────────────────────────────────
-- SECURITY DEFINER + SET search_path = public previne search_path injection.
-- Retorna resultados ordenados por similaridade coseno, com threshold mínimo.

CREATE OR REPLACE FUNCTION public.buscar_jurisprudencia(
  query_embedding       vector(768),
  match_count           int     DEFAULT 10,
  similarity_threshold  float   DEFAULT 0.5
)
RETURNS TABLE (
  id               UUID,
  process_number   TEXT,
  publication_date DATE,
  relator          TEXT,
  tema             TEXT,
  excerpt          TEXT,
  pdf_path         TEXT,
  similarity       FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.process_number,
    j.publication_date,
    j.relator,
    j.tema,
    j.excerpt,
    j.pdf_path,
    (1 - (j.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.jurisprudences j
  WHERE j.embedding IS NOT NULL
    AND (1 - (j.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Conceder execução apenas para usuários autenticados
GRANT EXECUTE ON FUNCTION public.buscar_jurisprudencia TO authenticated;

-- ─── Storage: bucket jurisprudencia ──────────────────────────────────────────
-- Bucket privado para PDFs e JSONs extraídos dos acórdãos.
-- Limite de 50 MB por arquivo, apenas PDF e JSON permitidos.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jurisprudencia',
  'jurisprudencia',
  false,
  52428800,  -- 50 MB
  ARRAY['application/pdf', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas do Storage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'jurisprudencia_authenticated_select'
  ) THEN
    CREATE POLICY "jurisprudencia_authenticated_select"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'jurisprudencia');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'jurisprudencia_authenticated_insert'
  ) THEN
    CREATE POLICY "jurisprudencia_authenticated_insert"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'jurisprudencia');
  END IF;
END
$$;
