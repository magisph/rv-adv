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
  sessions: () => ['jurisprudencia', 'chat-sessions'],
  sessionMessages: (sessionId) => ['jurisprudencia', 'chat-messages', sessionId],
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
 * Suporta memória persistente via sessionId.
 *
 * @param {string} query - Pergunta jurídica do usuário
 * @param {number} [matchCount=5] - Número de acórdãos de contexto (1-10)
 * @param {string|null} [sessionId=null] - ID da sessão para memória persistente
 * @returns {Promise<{resposta: string, fontes: Array, totalFontes: number, sessionId: string|null}>}
 * @throws {Error} Se a Edge Function retornar erro
 */
export async function chatJurisprudencia(query, matchCount = 5, sessionId = null) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('A pergunta não pode ser vazia.');
  }

  const body = {
    query: query.trim(),
    matchCount: Math.min(Math.max(1, matchCount), 10),
  };
  if (sessionId) body.sessionId = sessionId;

  const { data, error } = await supabase.functions.invoke('chat-jurisprudencia', { body });

  if (error) {
    throw new Error(`Falha no chat jurisprudencial: ${error.message}`);
  }

  if (!data?.resposta) {
    throw new Error('Resposta vazia recebida do servidor.');
  }

  return data;
}

// ─── Gestão de sessões de Chat ────────────────────────────────────────────────

/**
 * Cria uma nova sessão de chat com título derivado da primeira pergunta.
 *
 * @param {string} titulo - Título da sessão (normalmente a 1ª pergunta truncada)
 * @returns {Promise<{id: string, title: string, created_at: string}>}
 */
export async function createChatSession(titulo) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const title = (titulo || 'Nova consulta').slice(0, 100);

  const { data, error } = await supabase
    .from('jurisprudencia_chat_sessions')
    .insert({ user_id: user.id, title })
    .select('id, title, created_at')
    .single();

  if (error) throw new Error(`Erro ao criar sessão: ${error.message}`);
  return data;
}

/**
 * Lista todas as sessões de chat do usuário autenticado, ordenadas pela mais recente.
 *
 * @returns {Promise<Array<{id: string, title: string, created_at: string, updated_at: string}>>}
 */
export async function listChatSessions() {
  const { data, error } = await supabase
    .from('jurisprudencia_chat_sessions')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(`Erro ao listar sessões: ${error.message}`);
  return data ?? [];
}

/**
 * Carrega as mensagens de uma sessão de chat específica.
 *
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<Array<{id: string, role: string, content: string, created_at: string}>>}
 */
export async function loadSessionMessages(sessionId) {
  if (!sessionId) return [];

  const { data, error } = await supabase
    .from('jurisprudencia_chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Erro ao carregar mensagens: ${error.message}`);
  return data ?? [];
}

/**
 * Deleta uma sessão de chat (e suas mensagens, via CASCADE).
 *
 * @param {string} sessionId - ID da sessão a deletar
 * @returns {Promise<void>}
 */
export async function deleteChatSession(sessionId) {
  const { error } = await supabase
    .from('jurisprudencia_chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw new Error(`Erro ao deletar sessão: ${error.message}`);
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
    .select('id, process_number, publication_date, trial_date, relator, tema, excerpt, embedding_status, source, jurisdicao, orgao_julgador, similarity_score, is_unique_teor', {
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
 * Coleta acórdãos da TNU em lote usando o novo backend com loop interno.
 * O backend faz múltiplas páginas de 10 em uma única chamada HTTP.
 *
 * @param {string} [termo='aposentadoria por incapacidade'] - Termo de busca
 * @param {number} [totalPaginas=5] - Número de lotes a coletar (cada lote = 100 acórdãos)
 * @param {number} [_tamanhoIgnorado=10] - Ignorado (backend usa limite=100 internamente)
 * @param {function} [onProgress] - Callback de progresso (loteAtual, totalLotes, coletadosAteAgora)
 * @returns {Promise<{totalColetados: number, paginas: number}>}
 */
export async function dispararScrapingTNULote(
  termo = 'aposentadoria por incapacidade',
  totalPaginas = 5,
  _tamanhoIgnorado = 10,
  onProgress = null
) {
  // Cada lote coleta até 100 acórdãos (10 páginas TNU de 10 cada)
  const LIMITE_POR_LOTE = 100;
  const maxLotes = Math.min(Math.max(1, totalPaginas), 10);
  let totalColetados = 0;
  let lotesProcessados = 0;
  let paginaInicio = 0;

  for (let lote = 0; lote < maxLotes; lote++) {
    const { data, error } = await supabase.functions.invoke('scrape-tnu', {
      body: {
        termo,
        pagina_inicio: paginaInicio,
        limite: LIMITE_POR_LOTE,
      },
      headers: { 'x-region': 'sa-east-1' },
    });

    if (error) throw new Error(`Erro no scraping (lote ${lote + 1}): ${error.message}`);
    if (!data?.success) throw new Error(data?.error ?? 'Scraping falhou sem mensagem de erro.');

    totalColetados += data.coletados ?? 0;
    lotesProcessados++;

    if (onProgress) {
      onProgress(lote + 1, maxLotes, totalColetados);
    }

    // Para se não há mais resultados disponíveis
    if (!data.proximo_disponivel) break;

    // Avança para a próxima página de início
    paginaInicio = data.proxima_pagina ?? (paginaInicio + LIMITE_POR_LOTE / 10);

    // Pausa entre lotes para não sobrecarregar o portal TNU
    if (lote < maxLotes - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return { totalColetados, paginas: lotesProcessados };
}

// ─── Disparar scraping do TRF5 via Edge Function ──────────────────────────────
/**
 * Dispara o scraping de acórdãos da Turma Recursal do Ceará (TRF5) via Edge Function.
 *
 * @param {object} payload - Objeto de configuração da busca.
 * @param {string} payload.orgao - Sempre 'TRU'.
 * @param {string} payload.uf - Sempre 'CE'.
 * @param {string} payload.texto_livre - Termo de busca (min: 3, max: 100).
 * @param {string} [payload.data_julgamento_inicio] - Data no formato DD/MM/AAAA.
 * @param {string} [payload.data_julgamento_fim] - Data no formato DD/MM/AAAA.
 * @returns {Promise<object>} Dados retornados pela edge function
 */
export async function scrapeTRF5(payload) {
  const { data, error } = await supabase.functions.invoke('scrape-trf5', {
    body: payload,
  });

  if (error) {
    throw new Error(`Erro no scraping TRF5: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error ?? 'Scraping TRF5 falhou sem mensagem de erro.');
  }

  return data;
}
