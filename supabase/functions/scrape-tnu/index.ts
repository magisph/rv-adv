// ============================================================================
// Supabase Edge Function: scrape-tnu
// Extrai acórdãos diretamente do portal de jurisprudência da TNU
// (https://eproctnu-jur.cjf.jus.br/eproc/) usando fetch puro.
// O TNU retorna sempre 10 registros por página — este scraper faz loop
// interno de múltiplas páginas por chamada para coletar em lote.
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

// O TNU sempre retorna 10 registros por página, independente do parâmetro
const TNU_PAGE_SIZE = 10;

const SCRAPER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

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
  excerpt: string;
  full_text: string | null;
  pdf_path: string | null;
  tema: string;
  embedding_status: string;
}

/** Parseia os cards de resultado do HTML */
function parseResultCards(html: string, tema: string): AcordaoRow[] {
  const results: AcordaoRow[] = [];

  const cardRegex =
    /<div[^>]+class="[^"]*card[^"]*mb-3[^"]*resultadoItem[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*card[^"]*mb-3[^"]*resultadoItem|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[1];

    const numeroProcesso = extractProcesso(cardHtml);
    if (!numeroProcesso) continue;

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

    // Ementa via data-citacao — portal TNU usa ISO-8859-1, não UTF-8
    const citeMatch = cardHtml.match(/data-citacao="([^"]+)"/);
    let ementa = "";
    if (citeMatch) {
      ementa = decodeIso8859Cite(citeMatch[1]);
    }

    const decisaoText = decisaoMatch
      ? decisaoMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : null;

    results.push({
      process_number: numeroProcesso,
      trial_date: parseBrDate(djMatch ? djMatch[1] : null),
      publication_date: parseBrDate(dpMatch ? dpMatch[1] : null),
      relator: relatorMatch ? relatorMatch[1].trim() : null,
      excerpt: ementa || decisaoText || "",
      full_text: decisaoText,
      pdf_path: extractInteiroTeorUrl(cardHtml),
      tema,
      embedding_status: "pending",
    });
  }

  return results;
}

/**
 * Obtém sessão PHP do portal TNU.
 * A sessão é necessária para autenticar as requisições de busca.
 */
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
 * O TNU sempre retorna 10 registros por página (hdnInfraTamanho é ignorado).
 * Usa hdnInfraInicioRegistro para paginação offset.
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
    pagina_inicio?: number;
    limite?: number;
    // Parâmetros legados (compatibilidade)
    pagina?: number;
    tamanho?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const termo = (body.termo ?? "aposentadoria por incapacidade").slice(0, 200);

  // Suporte a parâmetros legados (pagina/tamanho) e novos (pagina_inicio/limite)
  const paginaInicio = body.pagina_inicio ?? body.pagina ?? 0;
  // Limite máximo de 100 registros por chamada (10 páginas de 10)
  const limite = Math.max(10, Math.min(body.limite ?? body.tamanho ?? 50, 100));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Obtém sessão PHP uma única vez para todas as páginas
    const phpSessId = await getTnuSession();

    let totalResultados = 0;
    const allAcordaos: AcordaoRow[] = [];
    let currentOffset = paginaInicio * TNU_PAGE_SIZE;
    const targetOffset = currentOffset + limite;

    // Loop de paginação: coleta até `limite` registros em páginas de 10
    while (currentOffset < targetOffset) {
      const { html, totalResultados: total } = await fetchTnuPage(
        termo,
        currentOffset,
        phpSessId
      );

      totalResultados = total;

      const acordaos = parseResultCards(html, termo);
      if (acordaos.length === 0) break;

      allAcordaos.push(...acordaos);
      currentOffset += TNU_PAGE_SIZE;

      // Para se não há mais resultados no TNU
      if (currentOffset >= total) break;

      // Pausa mínima entre requisições para não sobrecarregar o portal
      await new Promise((r) => setTimeout(r, 300));
    }

    if (allAcordaos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum acórdão encontrado para o termo informado",
          total_tnu: totalResultados,
          coletados: 0,
          salvos: 0,
          pagina_inicio: paginaInicio,
          proximo_disponivel: false,
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("jurisprudences")
      .upsert(allAcordaos, {
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

    const proximaPagina = Math.floor(currentOffset / TNU_PAGE_SIZE);
    const proximoDisponivel = currentOffset < totalResultados;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${allAcordaos.length} acórdão(s) coletado(s) com sucesso`,
        total_tnu: totalResultados,
        coletados: allAcordaos.length,
        salvos: upserted?.length ?? allAcordaos.length,
        pagina_inicio: paginaInicio,
        proxima_pagina: proximaPagina,
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
