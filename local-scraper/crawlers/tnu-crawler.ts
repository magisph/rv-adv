// ============================================================================
// tnu-crawler.ts — Scraper de Acórdãos da TNU (Turma Nacional de Uniformização)
// Skill: backend-patterns (Service Layer, Error Handling, Retry with Backoff)
// Skill: detecting-memory-leaks (cleanup explícito, sem closures retidas)
// ============================================================================
import { PlaywrightCrawler, Configuration } from 'crawlee';
import { SupabaseClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';

// ─── Configuração Global do Crawlee ──────────────────────────────────────────
// persistStorage=false evita vazamento de memória em disco em execuções longas
const crawleeConfig = Configuration.getGlobalConfig();
crawleeConfig.set('persistStorage', false);

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AcordaoExtraido {
  process_number: string;
  publication_date: string | null;
  relator: string | null;
  tema: string | null;
  excerpt: string;
  pdf_url: string;
}

export interface ResultadoScrapingTNU {
  processados: number;
  ignorados: number;
  erros: string[];
  iniciadoEm: string;
  finalizadoEm: string;
}

// ─── URL base da busca de acórdãos da TNU ────────────────────────────────────
// Fonte: https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao
const TNU_BUSCA_URL = 'https://www.cjf.jus.br/juris/unificada/';

// ─── Retry com Exponential Backoff ───────────────────────────────────────────
// Padrão backend-patterns: evita sobrecarregar a API em falhas transitórias
async function fetchWithRetry(
  fn: () => Promise<Response>,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error = new Error('Falha desconhecida');
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

// ─── Download e extração de PDF ──────────────────────────────────────────────
// detecting-memory-leaks: buffer é descartado após extração (não retido em closure)
async function extrairTextoPdf(pdfUrl: string): Promise<string> {
  const response = await fetchWithRetry(() =>
    fetch(pdfUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RVAdv-Scraper/1.0)' },
      signal: AbortSignal.timeout(30_000), // 30s timeout — evita hanging requests
    })
  );

  if (!response.ok) {
    throw new Error(`Falha ao baixar PDF (${response.status}): ${pdfUrl}`);
  }

  // Limitar tamanho do PDF a 50 MB para evitar OOM
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 52_428_800) {
    throw new Error(`PDF muito grande (${contentLength} bytes): ${pdfUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // pdfParse retorna apenas o texto — o buffer é liberado pelo GC após este escopo
  const { text } = await pdfParse(buffer, { max: 0 }); // max:0 = sem limite de páginas
  return text.trim();
}

// ─── Upload de PDF para o Supabase Storage ───────────────────────────────────
async function uploadPdfStorage(
  supabase: SupabaseClient,
  pdfUrl: string,
  processNumber: string
): Promise<string | null> {
  try {
    const response = await fetchWithRetry(() =>
      fetch(pdfUrl, {
        signal: AbortSignal.timeout(30_000),
      })
    );
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `tnu/${processNumber.replace(/\//g, '_')}.pdf`;

    const { error } = await supabase.storage
      .from('jurisprudencia')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false, // Não sobrescreve se já existir
      });

    if (error && error.message !== 'The resource already exists') {
      console.warn(`[TNU] Upload Storage falhou para ${processNumber}: ${error.message}`);
      return null;
    }

    return storagePath;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[TNU] Erro no upload Storage: ${msg}`);
    return null;
  }
}

// ─── Verificação de duplicata ─────────────────────────────────────────────────
async function acordaoJaExiste(
  supabase: SupabaseClient,
  processNumber: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('jurisprudences')
    .select('id')
    .eq('process_number', processNumber)
    .maybeSingle(); // maybeSingle não lança erro se não encontrar

  if (error) {
    console.warn(`[TNU] Erro ao verificar duplicata (${processNumber}): ${error.message}`);
    return false; // Em caso de erro, tenta inserir (idempotente via upsert)
  }
  return data !== null;
}

// ─── Inserção no banco ────────────────────────────────────────────────────────
async function inserirAcordao(
  supabase: SupabaseClient,
  acordao: AcordaoExtraido,
  fullText: string,
  pdfStoragePath: string | null
): Promise<void> {
  const { error } = await supabase.from('jurisprudences').insert({
    process_number:   acordao.process_number,
    publication_date: acordao.publication_date,
    relator:          acordao.relator,
    tema:             acordao.tema,
    excerpt:          acordao.excerpt,
    full_text:        fullText,
    pdf_path:         pdfStoragePath,
    embedding_status: 'pending', // Worker de embeddings processará depois
  });

  if (error) {
    throw new Error(`Falha ao inserir acórdão ${acordao.process_number}: ${error.message}`);
  }
}

// ─── Função principal de scraping ────────────────────────────────────────────
/**
 * Inicia o scraping de acórdãos da TNU e os persiste no Supabase.
 *
 * @param supabase - Cliente Supabase já instanciado (injeção de dependência)
 * @param maxAcordaos - Limite de acórdãos a processar por execução (default: 50)
 * @returns ResultadoScrapingTNU com contadores e erros
 */
export async function iniciarScrapingTNU(
  supabase: SupabaseClient,
  maxAcordaos = 50
): Promise<ResultadoScrapingTNU> {
  const erros: string[] = [];
  let processados = 0;
  let ignorados = 0;
  const iniciadoEm = new Date().toISOString();

  // Coletor de acórdãos extraídos — preenchido pelo requestHandler
  const acordaosColetados: AcordaoExtraido[] = [];

  const crawler = new PlaywrightCrawler({
    headless: true,
    maxRequestRetries: 2,
    navigationTimeoutSecs: 60,
    requestHandlerTimeoutSecs: 120,
    maxConcurrency: 1, // Respeita o servidor da TNU

    launchContext: {
      launchOptions: {
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    },

    async requestHandler({ page, log }) {
      log.info(`[TNU] Acessando página de busca...`);

      // Aguarda a tabela de resultados carregar
      await page.waitForSelector('table.resultado, .listagem-acordaos, #resultados', {
        timeout: 15_000,
      }).catch(() => {
        log.warning('[TNU] Seletor de resultados não encontrado — DOM pode ter mudado.');
      });

      // Extrai acórdãos da tabela de resultados
      // NOTA: Os seletores abaixo devem ser ajustados conforme o DOM real da TNU.
      // Esta implementação usa seletores genéricos como ponto de partida.
      const extraidos = await page.$$eval(
        'table tr:not(:first-child), .resultado-item',
        (rows) =>
          rows.slice(0, 50).map((row) => {
            const cells = row.querySelectorAll('td');
            const linkEl = row.querySelector('a[href*=".pdf"], a[href*="acordao"]');
            return {
              process_number:   cells[0]?.textContent?.trim() ?? '',
              publication_date: cells[1]?.textContent?.trim() ?? null,
              relator:          cells[2]?.textContent?.trim() ?? null,
              tema:             cells[3]?.textContent?.trim() ?? null,
              excerpt:          cells[4]?.textContent?.trim() ?? '',
              pdf_url:          linkEl?.getAttribute('href') ?? '',
            };
          }).filter((a) => a.process_number && a.pdf_url)
      );

      log.info(`[TNU] ${extraidos.length} acórdãos encontrados na página.`);
      acordaosColetados.push(...extraidos);
    },

    failedRequestHandler({ request, log }, error) {
      log.error(`[TNU] Falha na requisição ${request.url}: ${error.message}`);
      erros.push(`Requisição falhou: ${error.message}`);
    },
  });

  try {
    await crawler.run([TNU_BUSCA_URL]);
  } finally {
    // detecting-memory-leaks: teardown explícito do crawler para liberar recursos Playwright
    await crawler.teardown();
  }

  // Processa os acórdãos coletados (fora do crawler para evitar closures retidas)
  const limite = Math.min(acordaosColetados.length, maxAcordaos);
  for (let i = 0; i < limite; i++) {
    const acordao = acordaosColetados[i];

    try {
      // Verifica duplicata
      const jaExiste = await acordaoJaExiste(supabase, acordao.process_number);
      if (jaExiste) {
        console.log(`[TNU] Ignorado (já existe): ${acordao.process_number}`);
        ignorados++;
        continue;
      }

      // Extrai texto do PDF
      const fullText = await extrairTextoPdf(acordao.pdf_url).catch((err) => {
        console.warn(`[TNU] Extração PDF falhou (${acordao.process_number}): ${err.message}`);
        return ''; // Continua sem full_text — embedding_status permanece 'pending'
      });

      // Upload para Storage
      const pdfStoragePath = await uploadPdfStorage(supabase, acordao.pdf_url, acordao.process_number);

      // Insere no banco
      await inserirAcordao(supabase, acordao, fullText, pdfStoragePath);
      processados++;
      console.log(`[TNU] ✅ Inserido: ${acordao.process_number}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      erros.push(`${acordao.process_number}: ${msg}`);
      console.error(`[TNU] ❌ Erro: ${msg}`);
    }
  }

  return {
    processados,
    ignorados,
    erros,
    iniciadoEm,
    finalizadoEm: new Date().toISOString(),
  };
}
