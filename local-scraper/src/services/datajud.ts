// ============================================================================
// local-scraper/src/services/datajud.ts
// Motor Bulk de Alta Performance para o DataJud (CNJ/Elasticsearch)
//
// Estratégia:
//   - Limita concorrência a CONCURRENCY_LIMIT requisições simultâneas
//   - Agrupa processos por tribunal para minimizar round-trips à API
//   - Query DSL com `minimum_should_match` (busca por múltiplos números)
//   - Retry exponencial com jitter para lidar com instabilidades
//
// SECURITY: Esta chave só existe no servidor Node.js (Hetzner).
//           NUNCA exposta ao browser ou ao Supabase frontend.
// ============================================================================

import { TRIBUNAL_MAP, resolverTribunal, formatarNumeroCNJ } from './tribunalUtils.js';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ProcessoBulkInput {
  numeroCNJ: string;   // Formato raw ou formatado (20 dígitos ou com máscara)
}

export interface ResultadoBulk {
  numero: string;
  tribunal: string;
  encontrado: boolean;
  classeProcessual: unknown | null;
  assuntos: unknown[];
  movimentos: unknown[];
  orgaoJulgador: unknown | null;
  dataAjuizamento: string | null;
  grau: string | null;
  nivelSigilo: number | null;
  formato: string | null;
  erro?: string;
  _raw?: unknown;
}

export interface BulkResponse {
  total: number;
  encontrados: number;
  resultados: ResultadoBulk[];
  erros: { numero: string; erro: string }[];
  duracao_ms: number;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br';
const CONCURRENCY_LIMIT = 5;      // Máximo de tribunais consultados em paralelo
const MAX_POR_QUERY = 50;         // Máximo de processos por query DSL (limite DataJud)
const TIMEOUT_MS = 30_000;        // 30s de timeout por chamada externa
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;      // Backoff base: 1s, 2s, 4s

// ─── Retry com backoff exponencial + jitter ──────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  baseMs = RETRY_BASE_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      // Não retentar em erros 4xx (cliente) — apenas 5xx e timeouts
      if (err?.status && err.status >= 400 && err.status < 500) {
        throw err;
      }

      if (attempt < retries) {
        // Jitter aleatório ±20% para evitar thundering herd
        const jitter = 1 + (Math.random() * 0.4 - 0.2);
        const delay = Math.pow(2, attempt) * baseMs * jitter;
        console.warn(
          `[DataJud Bulk] Tentativa ${attempt + 1}/${retries + 1} falhou. ` +
          `Retry em ${Math.round(delay)}ms. Erro: ${err.message}`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error('Todas as tentativas falharam');
}

// ─── Limiter de concorrência (pool simples) ──────────────────────────────────

async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  // Dispara `limit` workers em paralelo
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

// ─── Query DSL Elasticsearch (minimum_should_match) ──────────────────────────

function buildBulkQuery(numerosFormatados: string[]): object {
  if (numerosFormatados.length === 1) {
    return {
      query: {
        match: { numeroProcesso: numerosFormatados[0] },
      },
      size: 1,
    };
  }

  return {
    query: {
      bool: {
        should: numerosFormatados.map((n) => ({
          match: { numeroProcesso: n },
        })),
        minimum_should_match: 1,
      },
    },
    size: Math.min(numerosFormatados.length, MAX_POR_QUERY),
  };
}

// ─── Consulta de um lote de processos por tribunal ───────────────────────────

async function consultarLoteTribunal(
  tribunal: string,
  numerosFormatados: string[],
  apiKey: string
): Promise<{ tribunal: string; hits: any[] }> {
  const endpoint = `${DATAJUD_BASE}/api_publica_${tribunal.toLowerCase()}/_search`;
  const query = buildBulkQuery(numerosFormatados);

  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `APIKey ${apiKey}`,
        },
        body: JSON.stringify(query),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      const err: any = new Error(
        `DataJud ${response.status} para ${tribunal}: ${body}`
      );
      err.status = response.status;
      throw err;
    }

    const json: any = await response.json();
    const hits: any[] = json?.hits?.hits ?? [];
    return { tribunal, hits };
  });
}

// ─── Normaliza um hit do Elasticsearch para ResultadoBulk ───────────────────

function normalizarHit(source: any, tribunal: string): Omit<ResultadoBulk, 'numero'> {
  return {
    tribunal,
    encontrado: true,
    classeProcessual: source.classe ?? source.classeProcessual ?? null,
    assuntos: source.assuntos ?? [],
    movimentos: (source.movimentos ?? []).slice(0, 30), // Limita retorno
    orgaoJulgador: source.orgaoJulgador ?? null,
    dataAjuizamento: source.dataAjuizamento ?? null,
    grau: source.grau ?? null,
    nivelSigilo: source.nivelSigilo ?? null,
    formato: source.formato ?? null,
    _raw: source,
  };
}

// ─── Função Principal Exportada ───────────────────────────────────────────────

/**
 * consultarBulk(processos, apiKey)
 *
 * Consulta um array de números CNJ em paralelo (agrupados por tribunal),
 * respeitando o limite de concorrência para não sobrecarregar a API pública.
 *
 * @param processos - Array de { numeroCNJ } com números no formato CNJ (20 dígitos)
 * @param apiKey    - Chave da API DataJud (carregada do ambiente do servidor)
 * @returns BulkResponse com resultados agregados e métricas
 */
export async function consultarBulk(
  processos: ProcessoBulkInput[],
  apiKey: string
): Promise<BulkResponse> {
  const inicio = Date.now();
  const resultadosMap = new Map<string, ResultadoBulk>();
  const erros: { numero: string; erro: string }[] = [];

  if (!apiKey) {
    throw new Error('DATAJUD_API_KEY não configurada no servidor Hetzner.');
  }

  // ── 1. Normaliza e valida todos os números CNJ ───────────────────────────
  const processosParsed: { original: string; formatado: string; tribunal: string }[] = [];

  for (const { numeroCNJ } of processos) {
    try {
      const formatado = formatarNumeroCNJ(numeroCNJ);
      const tribunal = resolverTribunal(numeroCNJ);
      processosParsed.push({ original: numeroCNJ, formatado, tribunal });

      // Inicializa resultado como "não encontrado" (será sobrescrito se achado)
      resultadosMap.set(formatado, {
        numero: formatado,
        tribunal,
        encontrado: false,
        classeProcessual: null,
        assuntos: [],
        movimentos: [],
        orgaoJulgador: null,
        dataAjuizamento: null,
        grau: null,
        nivelSigilo: null,
        formato: null,
      });
    } catch (err: any) {
      erros.push({ numero: numeroCNJ, erro: err.message });
    }
  }

  // ── 2. Agrupa por tribunal ────────────────────────────────────────────────
  const porTribunal = new Map<string, string[]>();
  for (const { formatado, tribunal } of processosParsed) {
    if (!porTribunal.has(tribunal)) porTribunal.set(tribunal, []);
    porTribunal.get(tribunal)!.push(formatado);
  }

  // ── 3. Executa consultas em paralelo com limite de concorrência ──────────
  const tasks = Array.from(porTribunal.entries()).map(
    ([tribunal, numeros]) => async () => {
      try {
        const { hits } = await consultarLoteTribunal(tribunal, numeros, apiKey);

        // Mapeia hits de volta para os números solicitados
        for (const hit of hits) {
          const src = hit._source;
          const numeroRetornado: string = src.numeroProcesso;

          if (resultadosMap.has(numeroRetornado)) {
            resultadosMap.set(numeroRetornado, {
              numero: numeroRetornado,
              ...normalizarHit(src, tribunal),
            });
          }
        }
      } catch (err: any) {
        // Marca todos os processos deste tribunal como erro
        for (const n of numeros) {
          erros.push({ numero: n, erro: `Falha no tribunal ${tribunal}: ${err.message}` });
          resultadosMap.delete(n);
        }
      }
    }
  );

  await runWithConcurrencyLimit(tasks, CONCURRENCY_LIMIT);

  // ── 4. Compila resultado final ────────────────────────────────────────────
  const resultados = Array.from(resultadosMap.values());
  const encontrados = resultados.filter((r) => r.encontrado).length;

  return {
    total: processos.length,
    encontrados,
    resultados,
    erros,
    duracao_ms: Date.now() - inicio,
  };
}
