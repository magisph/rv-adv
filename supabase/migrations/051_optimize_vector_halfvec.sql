-- =====================================================================
-- Migration 051: Otimização Vetorial — vector(3072) → halfvec(3072) + HNSW sintonizado
--
-- Motivação: O modelo Gemini embedding-001 produz vetores densos de 3072 dimensões.
-- A 'float32' plena consome ~12.2KB por linha — impraticável para HNSW em alta escala.
-- 'halfvec' (float16) corta o consumo de RAM à metade com perda de recall imperceptível
-- em textos jurídicos, viabilizando SLA de busca semântica sub-500ms.
--
-- Depende de: pgvector >= 0.7.0 (suporte a halfvec)
-- Skill: supabase-postgres-best-practices
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO A: Derrubar todos os índices de embedding existentes
-- ═══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  idx_name text;
BEGIN
  FOR idx_name IN
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'jurisprudences' AND indexdef LIKE '%embedding%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(idx_name);
    RAISE NOTICE '[051] Dropped index: %', idx_name;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO B: Cast on-the-fly de vector(3072) → halfvec(3072)
-- Preserva dados existentes via casting explícito USING
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.jurisprudences
  ALTER COLUMN embedding TYPE halfvec(3072)
  USING embedding::halfvec(3072);

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO C: Recriar a RPC buscar_jurisprudencia com tipagem halfvec nativa
-- ═══════════════════════════════════════════════════════════════════════

-- C.1 — Drop dinâmico de todas as sobrecargas existentes (evita colisão de assinatura)
DO $$
DECLARE
  func_oid oid;
BEGIN
  FOR func_oid IN
    SELECT p.oid FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'buscar_jurisprudencia'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.buscar_jurisprudencia(' ||
            pg_get_function_identity_arguments(func_oid) || ') CASCADE';
    RAISE NOTICE '[051] Dropped RPC overload: %', pg_get_function_identity_arguments(func_oid);
  END LOOP;
END $$;

-- C.2 — Criar nova versão com halfvec(3072) como parâmetro de entrada
CREATE FUNCTION public.buscar_jurisprudencia(
  query_embedding      halfvec(3072),
  match_count          int   DEFAULT 10,
  similarity_threshold float DEFAULT 0.4
)
RETURNS TABLE (
  id               uuid,
  process_number   text,
  court_id         uuid,
  relator          text,
  tema             text,
  trial_date       date,
  publication_date date,
  excerpt          text,
  full_text        text,
  pdf_path         text,
  similarity       float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    j.id,
    j.process_number,
    j.court_id,
    j.relator,
    j.tema,
    j.trial_date,
    j.publication_date,
    j.excerpt,
    j.full_text,
    j.pdf_path,
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jurisprudences j
  WHERE
    j.embedding IS NOT NULL
    AND 1 - (j.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- C.3 — Conceder execução apenas para usuários autenticados
GRANT EXECUTE ON FUNCTION public.buscar_jurisprudencia(halfvec(3072), int, float)
  TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO D: Recriar o índice HNSW sintonizado para alta dimensão halfvec
-- m=24             → mais conexões por nó (recall alto em 3072 dims)
-- ef_construction=100 → maior janela de construção (precisão de vizinhança)
-- halfvec_cosine_ops → operador de similaridade cosseno para halfvec
-- CONCURRENTLY     → não bloqueia escritas durante a indexação
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX CONCURRENTLY idx_jurisprudences_embedding_hnsw
ON public.jurisprudences
USING hnsw (embedding halfvec_cosine_ops)
WITH (
  m = 24,
  ef_construction = 100
);
