// ============================================================================
// scrape-tnu — Supabase Edge Function
// Coleta acórdãos do portal de jurisprudência da TNU.
// Filtra APENAS acórdãos com ementa completa — exclui decisões monocráticas e votos.
// Uma chamada = uma página (10 registros). O pg_cron faz as chamadas sequenciais.
// Deploy: supabase functions deploy scrape-tnu --no-verify-jwt --use-api
// ============================================================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://rafaelavasconcelos.adv.br",
  "https://www.rafaelavasconcelos.adv.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-region",
  };
}

// ─── TNU SCRAPER ──────────────────────────────────────────────────────────────
const TNU_BASE = "https://eproctnu-jur.cjf.jus.br/eproc/";
const TNU_SEARCH_PAGE =
  TNU_BASE +
  "externo_controlador.php?acao=jurisprudencia@jurisprudencia/pesquisar";
const TNU_RESULTS_URL =
  TNU_BASE +
  "externo_controlador.php?acao=jurisprudencia@jurisprudencia/listar_resultados";

// O TNU sempre retorna 10 registros por página
const TNU_PAGE_SIZE = 10;

// Termo amplo para coletar todos os acórdãos previdenciários da TNU
const TERMO_PADRAO = "previdenciário";

const SCRAPER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

// ─── FILTROS DE QUALIDADE ──────────────────────────────────────────────────────
/**
 * Palavras-chave que identificam decisões monocráticas e votos.
 * Qualquer ementa que contenha esses padrões é descartada.
 */
const PADROES_EXCLUSAO = [
  /DECIS[ÃA]O MONOCR[ÁA]TICA/i,
  /AGRAVO CONTRA DECIS[ÃA]O MONOCR[ÁA]TICA/i,
  /^VOTO\b/i,
  /^VOTO-VISTA\b/i,
  /PEDIDO DE RECONSIDER/i,
];

/**
 * Verifica se a ementa é de um acórdão válido (não monocrática, não voto).
 * Retorna true se deve ser incluído, false se deve ser descartado.
 */
function isAcordaoValido(ementa: string): boolean {
  if (!ementa || ementa.trim().length < 50) return false;
  const upper = ementa.toUpperCase();
  // Deve começar com EMENTA
  if (!upper.startsWith("EMENTA")) return false;
  // Não deve conter padrões de exclusão
  for (const pattern of PADROES_EXCLUSAO) {
    if (pattern.test(ementa)) return false;
  }
  return true;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Converte data no formato DD/MM/AAAA para AAAA-MM-DD */
function parseBrDate(s: string | null): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Extrai o número do processo */
function extractProcesso(cardHtml: string): string {
  const re =
    /resLabel[^>]*>\s*PROCESSO\s*<\/div>[\s\S]*?(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/i;
  const m = cardHtml.match(re);
  return m ? m[1].trim() : "";
}

/**
 * Decodifica string URL-encoded em ISO-8859-1 (padrão do portal TNU).
 * O portal TNU usa charset=iso-8859-1 — o decodeURIComponent padrão (UTF-8) corrompe acentos.
 */
function decodeIso8859Cite(encoded: string): string {
  const raw = encoded
    .replace(/%([0-9A-Fa-f]{2})/g, (_: string, hex: string) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/\+/g, " ");
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i) & 0xff;
  }
  return new TextDecoder("iso-8859-1").decode(bytes);
}

/** Extrai o link para inteiro teor */
function extractInteiroTeorUrl(cardHtml: string): string | null {
  const m = cardHtml.match(
    /data-link="([^"]+download_inteiro_teor[^"]+)"/
  );
  if (!m) return null;
  return TNU_BASE + m[1].replace(/&amp;/g, "&");
}

interface AcordaoRow {
  process_number: string;
  trial_date: string | null;
  publication_date: string | null;
  relator: string | null;
  ementa: string;           // Ementa completa — campo principal
  excerpt: string;          // Alias de ementa para compatibilidade
  full_text: string | null; // Texto da decisão (campo DECISÃO do card)
  pdf_path: string | null;
  tema: string;
  embedding_status: string;
}

/**
 * Parseia os cards de resultado do HTML.
 * Filtra APENAS acórdãos com ementa válida — exclui monocráticas e votos.
 */
function parseResultCards(html: string): AcordaoRow[] {
  const results: AcordaoRow[] = [];
  let totalCards = 0;
  let filtrados = 0;

  const cardRegex =
    /<div[^>]+class="[^"]*card[^"]*mb-3[^"]*resultadoItem[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*card[^"]*mb-3[^"]*resultadoItem|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[1];
    totalCards++;

    const numeroProcesso = extractProcesso(cardHtml);
    if (!numeroProcesso) continue;

    // Ementa via data-citacao — portal TNU usa ISO-8859-1, não UTF-8
    const citeMatch = cardHtml.match(/data-citacao="([^"]+)"/);
    if (!citeMatch) continue;

    const ementa = decodeIso8859Cite(citeMatch[1]);

    // ── FILTRO PRINCIPAL: aceita apenas acórdãos com ementa válida ──
    if (!isAcordaoValido(ementa)) {
      filtrados++;
      continue;
    }

    const djMatch = cardHtml.match(
      /DATA DO JULGAMENTO[\s\S]*?resValue[^>]*>\s*(\d{2}\/\d{2}\/\d{4})/i
    );
    const dpMatch = cardHtml.match(
      /DATA DA PUBLICA[\s\S]*?resValue[^>]*>\s*(\d{2}\/\d{2}\/\d{4})/i
    );
    const relatorMatch = cardHtml.match(
      /RELATOR[^<]*<\/div>\s*<div[^>]*resValue[^>]*>\s*([^<\n]+?)\s*<\/div>/i
    );
    const decisaoMatch = cardHtml.match(
      /DECIS[ÃA]O\s*<\/div>\s*<div[^>]*resValue[^>]*>([\s\S]*?)<\/div>/i
    );
    const decisaoText = decisaoMatch
      ? decisaoMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;

    // Extrai tema a partir da ementa (primeira linha após "EMENTA:")
    const temaMatch = ementa.match(/EMENTA:\s*([^\n.]+)/i);
    const tema = temaMatch
      ? temaMatch[1].trim().slice(0, 200).toLowerCase()
      : "previdenciário";

    results.push({
      process_number: numeroProcesso,
      trial_date: parseBrDate(djMatch ? djMatch[1] : null),
      publication_date: parseBrDate(dpMatch ? dpMatch[1] : null),
      relator: relatorMatch ? relatorMatch[1].trim() : null,
      ementa,
      excerpt: ementa,   // Ementa completa — sem truncamento
      full_text: decisaoText,
      pdf_path: extractInteiroTeorUrl(cardHtml),
      tema,
      embedding_status: "pending",
    });
  }

  console.log(`parseResultCards: ${totalCards} cards, ${filtrados} filtrados (monocrática/voto), ${results.length} acórdãos válidos`);
  return results;
}

// ─── TNU FETCH ────────────────────────────────────────────────────────────────

/** Obtém sessão PHP do portal TNU. */
async function getTnuSession(): Promise<string> {
  const sessionResp = await fetch(TNU_SEARCH_PAGE, {
    headers: {
      "User-Agent": SCRAPER_UA,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  const setCookieHeader = sessionResp.headers.get("set-cookie") || "";
  const phpSessMatch = setCookieHeader.match(/PHPSESSID=([^;]+)/);
  const phpSessId = phpSessMatch ? phpSessMatch[1] : "";

  if (!phpSessId) {
    throw new Error("Não foi possível obter sessão PHP do portal TNU");
  }

  return phpSessId;
}

/**
 * Busca uma página de resultados do TNU.
 * offset = hdnInfraInicioRegistro (0, 10, 20, ...)
 */
async function fetchTnuPage(
  termoBusca: string,
  offset: number,
  phpSessId: string
): Promise<{ html: string; totalResultados: number }> {
  const formData = new URLSearchParams({
    txtPesquisa: termoBusca,
    rdoCampo: "I",
    hdnInfraPrefixoCookie: "TRF4_Eproc_",
    hdnInfraTamanho: String(TNU_PAGE_SIZE),
    hdnInfraInicioRegistro: String(offset),
  });

  const searchResp = await fetch(TNU_RESULTS_URL, {
    method: "POST",
    headers: {
      "User-Agent": SCRAPER_UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `PHPSESSID=${phpSessId}`,
      Referer: TNU_SEARCH_PAGE,
      Origin: "https://eproctnu-jur.cjf.jus.br",
    },
    body: formData.toString(),
    redirect: "follow",
  });

  if (!searchResp.ok) {
    throw new Error(`TNU retornou HTTP ${searchResp.status}`);
  }

  // Portal TNU usa ISO-8859-1 — decodificar corretamente via arrayBuffer
  const buffer = await searchResp.arrayBuffer();
  const html = new TextDecoder("iso-8859-1").decode(buffer);
  const totalMatch = html.match(/Documento \d+ de (\d+)/);
  const totalResultados = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  return { html, totalResultados };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  let body: {
    termo?: string;
    offset?: number;       // Offset direto (0, 10, 20, ...) — preferido pelo cron
    pagina_inicio?: number; // Compatibilidade: pagina * 10
    pagina?: number;        // Legado
    tamanho?: number;       // Legado (ignorado — sempre 10)
  } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const termo = (body.termo ?? TERMO_PADRAO).slice(0, 200);

  // Calcula o offset: suporta offset direto, pagina_inicio*10, ou pagina*10
  let offset = 0;
  if (typeof body.offset === "number") {
    offset = Math.max(0, body.offset);
  } else if (typeof body.pagina_inicio === "number") {
    offset = body.pagina_inicio * TNU_PAGE_SIZE;
  } else if (typeof body.pagina === "number") {
    offset = body.pagina * TNU_PAGE_SIZE;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const phpSessId = await getTnuSession();
    const { html, totalResultados } = await fetchTnuPage(termo, offset, phpSessId);

    const acordaos = parseResultCards(html);

    if (acordaos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum acórdão válido encontrado nesta página (todos filtrados como monocrática/voto ou sem ementa)",
          total_tnu: totalResultados,
          coletados: 0,
          salvos: 0,
          offset,
          proximo_offset: offset + TNU_PAGE_SIZE,
          proximo_disponivel: offset + TNU_PAGE_SIZE < totalResultados,
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("jurisprudences")
      .upsert(acordaos, {
        onConflict: "process_number",
        ignoreDuplicates: false,
      })
      .select("id");

    if (upsertError) {
      console.error("Upsert error:", upsertError.message);
      return new Response(
        JSON.stringify({
          error: "Erro ao salvar acórdãos",
          detail: upsertError.message,
        }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    const proximoOffset = offset + TNU_PAGE_SIZE;
    const proximoDisponivel = proximoOffset < totalResultados;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${acordaos.length} acórdão(s) coletado(s) com sucesso`,
        total_tnu: totalResultados,
        coletados: acordaos.length,
        salvos: upserted?.length ?? acordaos.length,
        offset,
        proximo_offset: proximoOffset,
        proximo_disponivel: proximoDisponivel,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("scrape-tnu error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
});
