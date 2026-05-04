-- ============================================================================
-- 20260504150000_jurisprudences_trf5_canonical_pipeline
-- Integra TRF5/CE ao fluxo canonico public.jurisprudences.
-- Nao cria nova tabela de jurisprudencia; descontinua o uso operacional da
-- tabela legada public.jurisprudencia_trf5 criada na migration 071.
-- ============================================================================

BEGIN;

ALTER TABLE public.jurisprudences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.jurisprudences
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'tnu',
  ADD COLUMN IF NOT EXISTS jurisdicao TEXT,
  ADD COLUMN IF NOT EXISTS process_number_raw TEXT,
  ADD COLUMN IF NOT EXISTS orgao_julgador TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS similarity_score DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS is_unique_teor BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS collection_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

UPDATE public.jurisprudences
SET source = COALESCE(source, 'tnu')
WHERE source IS NULL;

ALTER TABLE public.jurisprudences
  ALTER COLUMN source SET DEFAULT 'tnu',
  ALTER COLUMN source SET NOT NULL;

ALTER TABLE public.jurisprudences
  DROP CONSTRAINT IF EXISTS jurisprudences_similarity_score_range;

ALTER TABLE public.jurisprudences
  ADD CONSTRAINT jurisprudences_similarity_score_range
  CHECK (similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 1));

CREATE INDEX IF NOT EXISTS idx_jurisprudences_source
  ON public.jurisprudences (source);

CREATE INDEX IF NOT EXISTS idx_jurisprudences_jurisdicao
  ON public.jurisprudences (jurisdicao);

CREATE INDEX IF NOT EXISTS idx_jurisprudences_source_jurisdicao_trial_date
  ON public.jurisprudences (source, jurisdicao, trial_date DESC);

CREATE INDEX IF NOT EXISTS idx_jurisprudences_process_number_lookup
  ON public.jurisprudences (process_number);

CREATE INDEX IF NOT EXISTS idx_jurisprudences_orgao_julgador
  ON public.jurisprudences (orgao_julgador);

CREATE INDEX IF NOT EXISTS idx_jurisprudences_external_id
  ON public.jurisprudences (source, external_id)
  WHERE external_id IS NOT NULL;

DROP POLICY IF EXISTS "authenticated_all_jurisprudences" ON public.jurisprudences;
DROP POLICY IF EXISTS "jurisprudences_select_roles" ON public.jurisprudences;
DROP POLICY IF EXISTS "jurisprudences_insert_roles" ON public.jurisprudences;
DROP POLICY IF EXISTS "jurisprudences_update_roles" ON public.jurisprudences;
DROP POLICY IF EXISTS "jurisprudences_delete_roles" ON public.jurisprudences;

CREATE POLICY "jurisprudences_select_roles"
  ON public.jurisprudences
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = ANY (
      ARRAY['admin', 'dono', 'advogado', 'user', 'secretaria', 'assistente']
    )
  );

CREATE POLICY "jurisprudences_insert_roles"
  ON public.jurisprudences
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = ANY (ARRAY['admin', 'dono', 'advogado', 'user'])
  );

CREATE POLICY "jurisprudences_update_roles"
  ON public.jurisprudences
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = ANY (ARRAY['admin', 'dono', 'advogado', 'user'])
  )
  WITH CHECK (
    public.get_user_role() = ANY (ARRAY['admin', 'dono', 'advogado', 'user'])
  );

CREATE POLICY "jurisprudences_delete_roles"
  ON public.jurisprudences
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = ANY (ARRAY['admin', 'dono'])
  );

DO $$
BEGIN
  IF to_regclass('public.jurisprudencia_trf5') IS NOT NULL THEN
    INSERT INTO public.jurisprudences (
      process_number,
      process_number_raw,
      trial_date,
      relator,
      orgao_julgador,
      excerpt,
      source,
      jurisdicao,
      embedding_status,
      similarity_score,
      is_unique_teor,
      last_scraped_at
    )
    SELECT
      regexp_replace(process_number, '\D', '', 'g'),
      process_number,
      trial_date,
      relator,
      orgao_julgador,
      excerpt,
      'trf5',
      'CE',
      'pending',
      NULL,
      is_unique_teor,
      now()
    FROM public.jurisprudencia_trf5
    WHERE process_number IS NOT NULL
      AND excerpt IS NOT NULL
    ON CONFLICT (process_number) DO NOTHING;

    COMMENT ON TABLE public.jurisprudencia_trf5 IS
      'LEGACY: tabela paralela da migration 071. O fluxo ativo TRF5 grava em public.jurisprudences.';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.verificar_inserir_jurisprudencia(
  text,
  text,
  date,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  halfvec(3072),
  double precision
);

CREATE OR REPLACE FUNCTION public.verificar_inserir_jurisprudencia(
  p_process_number TEXT,
  p_process_number_raw TEXT,
  p_trial_date DATE,
  p_publication_date DATE,
  p_relator TEXT,
  p_orgao_julgador TEXT,
  p_excerpt TEXT,
  p_full_text TEXT,
  p_tema TEXT,
  p_source TEXT,
  p_jurisdicao TEXT,
  p_source_url TEXT,
  p_external_id TEXT,
  p_embedding halfvec(3072),
  p_similarity_threshold DOUBLE PRECISION DEFAULT 0.85
)
RETURNS TABLE (
  inserted_id UUID,
  inserted BOOLEAN,
  was_duplicate BOOLEAN,
  similarity_score DOUBLE PRECISION,
  is_unique_teor BOOLEAN,
  duplicate_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_source TEXT;
  v_existing_jurisdicao TEXT;
  v_similarity_score DOUBLE PRECISION;
  v_is_unique BOOLEAN;
  v_inserted_id UUID;
BEGIN
  IF p_process_number IS NULL OR btrim(p_process_number) = '' THEN
    RAISE EXCEPTION 'process_number obrigatorio';
  END IF;

  IF p_excerpt IS NULL OR btrim(p_excerpt) = '' THEN
    RAISE EXCEPTION 'excerpt obrigatorio';
  END IF;

  SELECT id, source, jurisdicao
  INTO v_existing_id, v_existing_source, v_existing_jurisdicao
  FROM public.jurisprudences
  WHERE process_number = p_process_number
  LIMIT 1;

  SELECT MAX(1 - (j.embedding <=> p_embedding))
  INTO v_similarity_score
  FROM public.jurisprudences j
  WHERE j.embedding IS NOT NULL
    AND (v_existing_id IS NULL OR j.id <> v_existing_id);

  v_is_unique := COALESCE(v_similarity_score, 0) < p_similarity_threshold;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_source = p_source
       AND COALESCE(v_existing_jurisdicao, '') = COALESCE(p_jurisdicao, '') THEN
      UPDATE public.jurisprudences
      SET
        process_number_raw = COALESCE(p_process_number_raw, process_number_raw),
        trial_date = COALESCE(p_trial_date, trial_date),
        publication_date = COALESCE(p_publication_date, publication_date),
        relator = NULLIF(btrim(COALESCE(p_relator, '')), ''),
        orgao_julgador = NULLIF(btrim(COALESCE(p_orgao_julgador, '')), ''),
        excerpt = p_excerpt,
        full_text = NULLIF(btrim(COALESCE(p_full_text, '')), ''),
        tema = COALESCE(NULLIF(btrim(COALESCE(p_tema, '')), ''), tema),
        source_url = COALESCE(NULLIF(btrim(COALESCE(p_source_url, '')), ''), source_url),
        external_id = COALESCE(NULLIF(btrim(COALESCE(p_external_id, '')), ''), external_id),
        embedding = p_embedding,
        embedding_status = 'completed',
        similarity_score = v_similarity_score,
        is_unique_teor = v_is_unique,
        last_scraped_at = now()
      WHERE id = v_existing_id
      RETURNING id INTO v_inserted_id;
    ELSE
      v_inserted_id := v_existing_id;
    END IF;

    RETURN QUERY SELECT
      v_inserted_id,
      false,
      true,
      v_similarity_score,
      v_is_unique,
      'process_number';
    RETURN;
  END IF;

  INSERT INTO public.jurisprudences (
    process_number,
    process_number_raw,
    trial_date,
    publication_date,
    relator,
    orgao_julgador,
    excerpt,
    full_text,
    tema,
    source,
    jurisdicao,
    source_url,
    external_id,
    embedding,
    embedding_status,
    similarity_score,
    is_unique_teor,
    last_scraped_at
  )
  VALUES (
    p_process_number,
    NULLIF(btrim(COALESCE(p_process_number_raw, '')), ''),
    p_trial_date,
    p_publication_date,
    NULLIF(btrim(COALESCE(p_relator, '')), ''),
    NULLIF(btrim(COALESCE(p_orgao_julgador, '')), ''),
    p_excerpt,
    NULLIF(btrim(COALESCE(p_full_text, '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(p_tema, '')), ''), 'previdenciario'),
    COALESCE(NULLIF(btrim(COALESCE(p_source, '')), ''), 'trf5'),
    COALESCE(NULLIF(btrim(COALESCE(p_jurisdicao, '')), ''), 'CE'),
    NULLIF(btrim(COALESCE(p_source_url, '')), ''),
    NULLIF(btrim(COALESCE(p_external_id, '')), ''),
    p_embedding,
    'completed',
    v_similarity_score,
    v_is_unique,
    now()
  )
  RETURNING id INTO v_inserted_id;

  RETURN QUERY SELECT
    v_inserted_id,
    true,
    NOT v_is_unique,
    v_similarity_score,
    v_is_unique,
    CASE WHEN v_is_unique THEN NULL ELSE 'similarity' END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_inserir_jurisprudencia(
  text,
  text,
  date,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  halfvec(3072),
  double precision
) TO authenticated;

COMMIT;
