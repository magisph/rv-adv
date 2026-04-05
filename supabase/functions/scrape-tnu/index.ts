// ============================================================================
// Supabase Edge Function: scrape-tnu
// Extrai acórdãos diretamente do portal de jurisprudência da TNU
// (https://eproctnu-jur.cjf.jus.br/eproc/) usando fetch puro.
// Sem necessidade de browser headless ou servidor local.
// Deploy: npx supabase functions deploy scrape-tnu
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
      "authorization, x-client-info, apikey, content-type",
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

/** Extrai o link para inteiro teor */
function extractInteiroTeorUrl(cardHtml: string): string | null {
  const m = cardHtml.match(
    /data-link="([^"]+download_inteiro_teor[^"]+)"/
  );
  if (!m) return null;
  return TNU_BASE + m[1].replace(/&amp;/g, "&");
}

interface AcordaoRow {
  numero_processo: string;
  tipo_documento: string;
  uf: string | null;
  data_julgamento: string | null;
  data_publicacao: string | null;
  relator: string | null;
  decisao: string | null;
  ementa: string;
  inteiro_teor_url: string | null;
  source_url: string;
  tribunal: string;
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

    const tipoMatch = cardHtml.match(/(PUIL|PEDILEF|PEDIDO DE UNIFORMIZA[^<]*)/i);
    const tipoDocumento = tipoMatch ? tipoMatch[1].trim() : "PUIL";

    const ufMatch = cardHtml.match(
      /resLabel[^>]*>\s*UF\s*<\/div>\s*<div[^>]*resValue[^>]*>\s*([A-Z]{2})\s*<\/div>/i
    );

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

    // Ementa via data-citacao (mais confiável)
    const citeMatch = cardHtml.match(/data-citacao="([^"]+)"/);
    let ementa = "";
    if (citeMatch) {
      try {
        ementa = decodeURIComponent(citeMatch[1].replace(/\+/g, "%20"));
      } catch {
        ementa = citeMatch[1];
      }
    }

    results.push({
      numero_processo: numeroProcesso,
      tipo_documento: tipoDocumento,
      uf: ufMatch ? ufMatch[1] : null,
      data_julgamento: parseBrDate(djMatch ? djMatch[1] : null),
      data_publicacao: parseBrDate(dpMatch ? dpMatch[1] : null),
      relator: relatorMatch ? relatorMatch[1].trim() : null,
      decisao: decisaoMatch
        ? decisaoMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : null,
      ementa,
      inteiro_teor_url: extractInteiroTeorUrl(cardHtml),
      source_url: TNU_RESULTS_URL,
      tribunal: "TNU",
      tema,
      embedding_status: "pending",
    });
  }

  return results;
}

/** Obtém sessão PHP e executa a busca */
async function fetchTnuResults(
  termoBusca: string,
  pagina: number,
  tamanhoPagina: number
): Promise<{ html: string; totalResultados: number }> {
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

  const formData = new URLSearchParams({
    txtPesquisa: termoBusca,
    rdoCampo: "I",
    hdnInfraPrefixoCookie: "TRF4_Eproc_",
    hdnInfraTamanho: String(tamanhoPagina),
    hdnInfraInicioRegistro: String(pagina * tamanhoPagina),
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

  const html = await searchResp.text();
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

  let body: { termo?: string; pagina?: number; tamanho?: number } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const termo = (body.termo ?? "aposentadoria por incapacidade").slice(0, 200);
  const pagina = Math.max(0, Math.min(body.pagina ?? 0, 99));
  const tamanho = Math.max(5, Math.min(body.tamanho ?? 10, 20));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { html, totalResultados } = await fetchTnuResults(
      termo,
      pagina,
      tamanho
    );
    const acordaos = parseResultCards(html, termo);

    if (acordaos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum acórdão encontrado para o termo informado",
          total_tnu: totalResultados,
          coletados: 0,
          salvos: 0,
          pagina,
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
      .upsert(acordaos, {
        onConflict: "numero_processo",
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

    return new Response(
      JSON.stringify({
        success: true,
        message: `${acordaos.length} acórdão(s) coletado(s) com sucesso`,
        total_tnu: totalResultados,
        coletados: acordaos.length,
        salvos: upserted?.length ?? acordaos.length,
        pagina,
        tamanho,
        proximo_disponivel: (pagina + 1) * tamanho < totalResultados,
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
