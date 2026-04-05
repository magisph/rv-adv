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

// ─── Disparar scraping da TNU via Edge Function ──────────────────────────────
/**
 * Dispara o scraping de acórdãos da TNU via Edge Function scrape-tnu.
 * Não requer servidor local — o scraping é feito diretamente pelo Supabase.
 *
 * @param {string} [termo='aposentadoria por incapacidade'] - Termo de busca
 * @param {number} [pagina=0] - Página de resultados (0-indexed)
 * @param {number} [tamanho=10] - Acórdãos por página (5-20)
 * @returns {Promise<{success: boolean, coletados: number, total_tnu: number, proximo_disponivel: boolean}>}
 */
export async function dispararScrapingTNU(termo = 'aposentadoria por incapacidade', pagina = 0, tamanho = 10) {
  const { data, error } = await supabase.functions.invoke('scrape-tnu', {
    body: { termo, pagina, tamanho },
  });

  if (error) {
    throw new Error(`Erro no scraping: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error ?? 'Scraping falhou sem mensagem de erro.');
  }

  return data;
}

// ─── Scraping em lote (múltiplas páginas) ─────────────────────────────────────
/**
 * Coleta múltiplas páginas de acórdãos da TNU sequencialmente.
 * Usa a Edge Function scrape-tnu para cada página.
 *
 * @param {string} [termo='aposentadoria por incapacidade'] - Termo de busca
 * @param {number} [totalPaginas=5] - Número de páginas a coletar (máx 10)
 * @param {number} [tamanho=10] - Acórdãos por página
 * @param {function} [onProgress] - Callback de progresso (pagina, total, coletados)
 * @returns {Promise<{totalColetados: number, paginas: number}>}
 */
export async function dispararScrapingTNULote(
  termo = 'aposentadoria por incapacidade',
  totalPaginas = 5,
  tamanho = 10,
  onProgress = null
) {
  const maxPaginas = Math.min(Math.max(1, totalPaginas), 10);
  let totalColetados = 0;
  let paginasProcessadas = 0;

  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const resultado = await dispararScrapingTNU(termo, pagina, tamanho);
    totalColetados += resultado.coletados ?? 0;
    paginasProcessadas++;

    if (onProgress) {
      onProgress(pagina + 1, maxPaginas, totalColetados);
    }

    // Se não há mais páginas disponíveis, parar
    if (!resultado.proximo_disponivel) break;

    // Pausa de 1s entre páginas para não sobrecarregar o servidor da TNU
    if (pagina < maxPaginas - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { totalColetados, paginas: paginasProcessadas };
}
