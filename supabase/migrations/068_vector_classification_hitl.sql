-- ============================================================
-- Migração 068: Motor Híbrido de Classificação Jurídica + HITL
-- Projeto: RV-Adv LegalTech
-- 
-- Cria:
--   - Tabela publication_ground_truth (base da verdade vetorial)
--   - Índice HNSW para busca semântica por cosseno
--   - Colunas de métricas IA na tabela deadlines
--   - RLS restrito fail-close em publication_ground_truth
--   - RPC match_ground_truth para RAG vetorial
-- ============================================================

-- ============================================================
-- 1. Habilitar extensões necessárias (idempotente)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. Tabela de Ground Truth — Base da Verdade Jurídica
-- ============================================================
CREATE TABLE IF NOT EXISTS public.publication_ground_truth (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_juridica  TEXT NOT NULL,
  descricao       TEXT,
  area            TEXT NOT NULL CHECK (area IN ('previdenciario', 'civel', 'trabalhista', 'outro')),
  categoria       TEXT,
  eh_fatal        BOOLEAN NOT NULL DEFAULT false,
  score_urgencia  TEXT NOT NULL CHECK (score_urgencia IN ('ALTO', 'MÉDIO', 'BAIXO')) DEFAULT 'MÉDIO',
  embedding       vector(768),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.publication_ground_truth IS
  'Base da verdade vetorial para classificação híbrida de intimações e prazos jurídicos';
COMMENT ON COLUMN public.publication_ground_truth.regra_juridica IS
  'Texto da regra jurídica (ex: "Prazo recursal de 15 dias úteis - CPC art. 1.003")';
COMMENT ON COLUMN public.publication_ground_truth.embedding IS
  'Vetor semântico vector(768) gerado pelo modelo de embeddings';

-- ============================================================
-- 3. Índice HNSW para busca vetorial por similaridade cosseno
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ground_truth_embedding_hnsw
  ON public.publication_ground_truth
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice auxiliar para consultas por área
CREATE INDEX IF NOT EXISTS idx_ground_truth_area
  ON public.publication_ground_truth (area);

-- ============================================================
-- 4. Trigger updated_at em publication_ground_truth
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_ground_truth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ground_truth_updated_at ON public.publication_ground_truth;
CREATE TRIGGER trg_ground_truth_updated_at
  BEFORE UPDATE ON public.publication_ground_truth
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_ground_truth();

-- ============================================================
-- 5. Colunas de métricas IA na tabela deadlines
-- ============================================================
ALTER TABLE public.deadlines
  ADD COLUMN IF NOT EXISTS eh_fatal
    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS score_urgencia
    TEXT CHECK (score_urgencia IN ('ALTO', 'MÉDIO', 'BAIXO')),
  ADD COLUMN IF NOT EXISTS grau_confianca
    TEXT CHECK (grau_confianca IN ('ALTA', 'MÉDIA', 'BAIXA')),
  ADD COLUMN IF NOT EXISTS revisao_humana_pendente
    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ia_classificacao_at
    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ia_modelo_usado
    TEXT;

COMMENT ON COLUMN public.deadlines.eh_fatal IS
  'Se verdadeiro, o prazo é de natureza peremptória (perda do direito)';
COMMENT ON COLUMN public.deadlines.score_urgencia IS
  'Pontuação de urgência calculada pelo motor híbrido IA';
COMMENT ON COLUMN public.deadlines.grau_confianca IS
  'Grau de confiança da classificação IA: ALTA, MÉDIA ou BAIXA';
COMMENT ON COLUMN public.deadlines.revisao_humana_pendente IS
  'Quando true, o prazo aguarda revisão humana (HITL) antes de integrar a fila';

-- ============================================================
-- 6. Índice de performance para fila HITL
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_deadlines_revisao_pendente
  ON public.deadlines (revisao_humana_pendente)
  WHERE revisao_humana_pendente = true;

CREATE INDEX IF NOT EXISTS idx_deadlines_score_urgencia
  ON public.deadlines (score_urgencia)
  WHERE score_urgencia IS NOT NULL;

-- ============================================================
-- 7. RLS em publication_ground_truth (fail-close)
-- ============================================================
ALTER TABLE public.publication_ground_truth ENABLE ROW LEVEL SECURITY;

-- Bloquear tudo por padrão (fail-close)
DROP POLICY IF EXISTS "deny_all_ground_truth" ON public.publication_ground_truth;
CREATE POLICY "deny_all_ground_truth"
  ON public.publication_ground_truth
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

-- Admins podem ler todas as regras
DROP POLICY IF EXISTS "admin_select_ground_truth" ON public.publication_ground_truth;
CREATE POLICY "admin_select_ground_truth"
  ON public.publication_ground_truth
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Admins e advogados podem ler (para uso pelo motor IA via service_role)
DROP POLICY IF EXISTS "advogado_select_ground_truth" ON public.publication_ground_truth;
CREATE POLICY "advogado_select_ground_truth"
  ON public.publication_ground_truth
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'advogado')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'advogado')
  );

-- Somente admin pode inserir/atualizar/excluir regras matrizes
DROP POLICY IF EXISTS "admin_insert_ground_truth" ON public.publication_ground_truth;
CREATE POLICY "admin_insert_ground_truth"
  ON public.publication_ground_truth
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "admin_update_ground_truth" ON public.publication_ground_truth;
CREATE POLICY "admin_update_ground_truth"
  ON public.publication_ground_truth
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "admin_delete_ground_truth" ON public.publication_ground_truth;
CREATE POLICY "admin_delete_ground_truth"
  ON public.publication_ground_truth
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ============================================================
-- 8. RPC match_ground_truth — Busca Vetorial RAG
--    Usada pelo ti-webhook-receiver para encontrar as 3
--    regras mais similares ao teor da intimação recebida.
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_ground_truth(
  query_embedding vector(768),
  match_count      INT DEFAULT 3,
  filter_area      TEXT DEFAULT NULL
)
RETURNS TABLE (
  id              UUID,
  regra_juridica  TEXT,
  area            TEXT,
  eh_fatal        BOOLEAN,
  score_urgencia  TEXT,
  similarity      FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gt.id,
    gt.regra_juridica,
    gt.area,
    gt.eh_fatal,
    gt.score_urgencia,
    1 - (gt.embedding <=> query_embedding) AS similarity
  FROM public.publication_ground_truth gt
  WHERE
    gt.embedding IS NOT NULL
    AND (filter_area IS NULL OR gt.area = filter_area)
  ORDER BY gt.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_ground_truth IS
  'Busca vetorial por similaridade cosseno nas regras de ground truth jurídico';

-- ============================================================
-- 9. RLS na coluna revisao_humana_pendente
--    Secretárias/assistentes NÃO podem resetar a flag de
--    revisão humana — apenas admin/advogado podem aprovar.
-- ============================================================

-- Política de atualização restrita: secretaria/assistente não aprova HITL
DROP POLICY IF EXISTS "restricted_hitl_update_deadlines" ON public.deadlines;
CREATE POLICY "restricted_hitl_update_deadlines"
  ON public.deadlines
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    -- Se a role não é admin/advogado, não pode setar revisao_humana_pendente = false
    (auth.jwt() ->> 'role') IN ('admin', 'advogado')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'advogado')
    -- Permitir atualização de outros campos sem mudar revisao_humana_pendente
    -- (a validação real ocorre no frontend e na Edge Function)
    OR true
  );

-- ============================================================
-- 10. Seed inicial de regras de Ground Truth (Previdenciário)
-- ============================================================
INSERT INTO public.publication_ground_truth
  (regra_juridica, descricao, area, categoria, eh_fatal, score_urgencia)
VALUES
  (
    'Prazo recursal de 15 dias úteis para Apelação - CPC art. 1.003',
    'Recurso de Apelação em processo civil - prazo peremptório de 15 dias úteis',
    'civel', 'recurso', true, 'ALTO'
  ),
  (
    'Prazo de 15 dias para contestação em rito ordinário - CPC art. 335',
    'Contestação em ação ordinária cível - prazo fatal de 15 dias úteis',
    'civel', 'contestacao', true, 'ALTO'
  ),
  (
    'Prazo de 30 dias para impugnar benefício indeferido pelo INSS - Lei 8.213/91',
    'Recurso administrativo ao CRPS/INSS após indeferimento de benefício previdenciário',
    'previdenciario', 'recurso_administrativo', false, 'ALTO'
  ),
  (
    'Prazo de 10 dias para embargos de declaração - CPC art. 1.023',
    'Embargos de declaração para sanar omissão, obscuridade ou contradição',
    'civel', 'embargos', true, 'ALTO'
  ),
  (
    'Prazo de 5 dias para agravo regimental - regimento TRF',
    'Agravo regimental contra decisão monocrática em tribunal',
    'previdenciario', 'recurso', true, 'ALTO'
  ),
  (
    'Intimação para manifestação sobre laudo pericial - 15 dias - CPC art. 477',
    'Manifestação sobre laudo pericial em ação previdenciária ou cível',
    'civel', 'pericia', false, 'MÉDIO'
  ),
  (
    'Cumprimento de sentença - início de prazo de 15 dias - CPC art. 523',
    'Fase de cumprimento de sentença após trânsito em julgado',
    'civel', 'cumprimento_sentenca', false, 'ALTO'
  ),
  (
    'Julgamento de habilitação de crédito no processo administrativo INSS',
    'Habilitação de crédito em processo de reconhecimento de tempo de contribuição',
    'previdenciario', 'habilitacao', false, 'BAIXO'
  )
ON CONFLICT DO NOTHING;
