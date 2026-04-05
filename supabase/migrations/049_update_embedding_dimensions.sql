-- Migration 049: Update embedding column from 768 to 3072 dimensions
-- Reason: gemini-embedding-001 (correct model) produces 3072-dim vectors.
--         The old embedding-001 model (768 dims) was deprecated and removed by Google.
-- Note: pgvector HNSW and IVFFlat both cap at 2000 dims.
--       For 3072-dim vectors, exact sequential scan is used (fine for < 50k rows).
-- Skill: supabase-postgres-best-practices

-- 1. Drop all existing embedding indexes (HNSW/IVFFlat)
DO $$
DECLARE
  idx_name text;
BEGIN
  FOR idx_name IN 
    SELECT indexname FROM pg_indexes 
    WHERE tablename = 'jurisprudences' AND indexdef LIKE '%embedding%'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(idx_name);
  END LOOP;
END $$;

-- 2. Drop all overloaded versions of buscar_jurisprudencia
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
  END LOOP;
END $$;

-- 3. Alter the embedding column to 3072 dimensions (nullify existing values)
ALTER TABLE public.jurisprudences
  ALTER COLUMN embedding TYPE vector(3072)
  USING NULL::vector(3072);

-- 4. Recreate the semantic search RPC with correct column names and 3072-dim signature
-- Uses exact sequential scan (no index) — acceptable for < 50k rows.
-- When the table exceeds 50k rows, consider truncating embeddings to 1536 dims
-- and using an IVFFlat index.
CREATE FUNCTION public.buscar_jurisprudencia(
  query_embedding   vector(3072),
  similarity_thresh float DEFAULT 0.5,
  max_results       int   DEFAULT 10
)
RETURNS TABLE (
  id               uuid,
  process_number   text,
  court_id         uuid,
  relator          text,
  tema             text,
  trial_date       date,
  excerpt          text,
  full_text        text,
  pdf_path         text,
  similarity        float
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
    j.excerpt,
    j.full_text,
    j.pdf_path,
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jurisprudences j
  WHERE
    j.embedding IS NOT NULL
    AND 1 - (j.embedding <=> query_embedding) >= similarity_thresh
  ORDER BY j.embedding <=> query_embedding
  LIMIT max_results;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_jurisprudencia(vector(3072), float, int)
  TO authenticated;
