// ============================================================================
// jurisprudenciaService.js — Serviço de Pesquisa Jurisprudencial Semântica
// Skill: coding-standards (JSDoc, error handling, named exports)
// Skill: senior-frontend (React Query integration, cache keys, abort signals)
// ============================================================================
import { supabase } from '../lib/supabase';

// ─── Tipos de taskType para o endpoint de embedding ──────────────────────────
export const EMBEDDING_TASK_TYPES = {
  QUERY: 'RETRIEVAL_QUERY',       // Para buscas (pergunta do usuário)
  DOCUMENT: 'RETRIEVAL_DOCUMENT', // Para indexação de documentos
};

// ─── Cache keys para React Query ─────────────────────────────────────────────
export const JURISPRUDENCIA_QUERY_KEYS = {
  search: (query) => ['jurisprudencia', 'search', query],
  chat: (query) => ['jurisprudencia', 'chat', query],
  list: (page, limit) => ['jurisprudencia', 'list', page, limit],
};

// ─── Busca semântica via Edge Function + RPC ──────────────────────────────────
/**
 * Realiza busca semântica vetorial na base de jurisprudência da TNU.
 * Internamente: gera embedding via Gemini → chama RPC buscar_jurisprudencia.
 *
 * @param {string} query - Texto da consulta jurídica
 * @param {number} [matchCount=10] - Número máximo de resultados (1-10)
 * @returns {Promise<Array>} Lista de acórdãos com score de similaridade
 * @throws {Error} Se a geração de embedding ou a busca vetorial falhar
 */
export async function buscarJurisprudencia(query, matchCount = 10) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('A consulta não pode ser vazia.');
  }

  const resolvedMatchCount = Math.min(Math.max(1, matchCount), 10);

  // 1. Gerar embedding da query via Edge Function
  const { data: embedData, error: embedError } = await supabase.functions.invoke(
    'generate-embedding',
    {
      body: {
        text: query.trim(),
        taskType: EMBEDDING_TASK_TYPES.QUERY,
      },
    }
  );

  if (embedError) {
    throw new Error(`Falha ao gerar embedding: ${embedError.message}`);
  }

  if (!Array.isArray(embedData?.embedding) || embedData.embedding.length === 0) {
    throw new Error('Embedding inválido retornado pelo servidor.');
  }

  // 2. Busca vetorial via RPC do Supabase
  const { data, error } = await supabase.rpc('buscar_jurisprudencia', {
    query_embedding: embedData.embedding,
    match_count: resolvedMatchCount,
    similarity_threshold: 0.4,
  });

  if (error) {
    throw new Error(`Falha na busca vetorial: ${error.message}`);
  }

  return data ?? [];
}

// ─── Chat RAG sobre jurisprudência ───────────────────────────────────────────
/**
 * Envia uma pergunta jurídica para o pipeline RAG (chat-jurisprudencia).
 * A Edge Function recupera contexto vetorial e gera resposta via Gemini Pro.
 *
 * @param {string} query - Pergunta jurídica do usuário
 * @param {number} [matchCount=5] - Número de acórdãos de contexto (1-10)
 * @returns {Promise<{resposta: string, fontes: Array, totalFontes: number}>}
 * @throws {Error} Se a Edge Function retornar erro
 */
export async function chatJurisprudencia(query, matchCount = 5) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('A pergunta não pode ser vazia.');
  }

  const { data, error } = await supabase.functions.invoke('chat-jurisprudencia', {
    body: {
      query: query.trim(),
      matchCount: Math.min(Math.max(1, matchCount), 10),
    },
  });

  if (error) {
    throw new Error(`Falha no chat jurisprudencial: ${error.message}`);
  }

  if (!data?.resposta) {
    throw new Error('Resposta vazia recebida do servidor.');
  }

  return data;
}

// ─── Listagem paginada de jurisprudências ─────────────────────────────────────
/**
 * Lista acórdãos da base de dados com paginação por offset.
 * Usa o padrão .range() do Supabase para paginação eficiente.
 *
 * @param {number} [page=0] - Página atual (0-indexed)
 * @param {number} [limit=20] - Itens por página
 * @param {string} [orderBy='publication_date'] - Campo de ordenação
 * @returns {Promise<{data: Array, count: number}>}
 */
export async function listarJurisprudencias(page = 0, limit = 20, orderBy = 'publication_date') {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('jurisprudences')
    .select('id, process_number, publication_date, relator, tema, excerpt, embedding_status, pdf_path', {
      count: 'exact',
    })
    .order(orderBy, { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Falha ao listar jurisprudências: ${error.message}`);
  }

  return { data: data ?? [], count: count ?? 0 };
}

// ─── Disparar scraping da TNU via local-scraper ───────────────────────────────
/**
 * Dispara o scraping de acórdãos da TNU via local-scraper.
 * Requer que o local-scraper esteja rodando em VITE_SCRAPER_URL.
 *
 * @param {number} [maxAcordaos=50] - Limite de acórdãos a processar
 * @returns {Promise<{processados: number, ignorados: number, erros: string[]}>}
 */
export async function dispararScrapingTNU(maxAcordaos = 50) {
  const scraperUrl = import.meta.env.VITE_SCRAPER_URL;
  if (!scraperUrl) {
    throw new Error('VITE_SCRAPER_URL não configurada. O scraper local não está disponível.');
  }

  const response = await fetch(`${scraperUrl}/api/jurisprudencia/scrape-tnu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxAcordaos }),
    signal: AbortSignal.timeout(300_000), // 5 minutos para scraping
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Scraping falhou: ${err.error ?? response.statusText}`);
  }

  return response.json();
}
