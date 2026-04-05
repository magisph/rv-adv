/**
 * scrape-tnu — Supabase Edge Function (JavaScript)
 *
 * Extrai acórdãos diretamente do portal de jurisprudência da TNU
 * (https://eproctnu-jur.cjf.jus.br/eproc/) usando fetch puro,
 * sem necessidade de browser headless ou servidor local.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://rafaelavasconcelos.adv.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(origin) {
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

const SCRAPER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

/** Converte data no formato DD/MM/AAAA para AAAA-MM-DD */
function parseBrDate(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Extrai o número do processo */
function extractProcesso(cardHtml) {
  const re =
    /resLabel[^>]*>\s*PROCESSO\s*<\/div>[\s\S]*?(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/i;
  const m = cardHtml.match(re);
  return m ? m[1].trim() : "";
}

/** Extrai o link para inteiro teor */
function extractInteiroTeorUrl(cardHtml) {
  const m = cardHtml.match(
    /data-link="([^"]+download_inteiro_teor[^"]+)"/
  );
  if (!m) return null;
  return TNU_BASE + m[1].replace(/&amp;/g, "&");
}

/** Parseia os cards de resultado do HTML */
function parseResultCards(html) {
  const results = [];

  // Split by card resultadoItem
  const cardRegex =
    /<div[^>]+class="[^"]*card[^"]*mb-3[^"]*resultadoItem[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*card[^"]*mb-3[^"]*resultadoItem|$)/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[1];

    const numeroProcesso = extractProcesso(cardHtml);
    if (!numeroProcesso) continue;

    // Tipo documento
    const tipoMatch = cardHtml.match(/(PUIL|PEDILEF|PEDIDO DE UNIFORMIZA[^<]*)/i);
    const tipoDocumento = tipoMatch ? tipoMatch[1].trim() : "PUIL";

    // UF
    const ufMatch = cardHtml.match(
      /resLabel[^>]*>\s*UF\s*<\/div>\s*<div[^>]*resValue[^>]*>\s*([A-Z]{2})\s*<\/div>/i
    );
    const uf = ufMatch ? ufMatch[1] : "";

    // Datas
    const djMatch = cardHtml.match(
      /DATA DO JULGAMENTO[\s\S]*?resValue[^>]*>\s*(\d{2}\/\d{2}\/\d{4})/i
    );
    const dpMatch = cardHtml.match(
      /DATA DA PUBLICA[\s\S]*?resValue[^>]*>\s*(\d{2}\/\d{2}\/\d{4})/i
    );

    // Relator
    const relatorMatch = cardHtml.match(
      /RELATOR[^<]*<\/div>\s*<div[^>]*resValue[^>]*>\s*([^<\n]+?)\s*<\/div>/i
    );

    // Decisão
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
      uf: uf || null,
      data_julgamento: parseBrDate(djMatch ? djMatch[1] : null),
      data_publicacao: parseBrDate(dpMatch ? dpMatch[1] : null),
      relator: relatorMatch
        ? relatorMatch[1].trim()
        : null,
      decisao: decisaoMatch
        ? decisaoMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : null,
      ementa,
      inteiro_teor_url: extractInteiroTeorUrl(cardHtml),
      source_url: TNU_RESULTS_URL,
    });
  }

  return results;
}

/** Obtém sessão PHP e executa a busca */
async function fetchTnuResults(termoBusca, pagina, tamanhoPagina) {
  // Step 1: Get session cookie
  const sessionResp = await fetch(TNU_SEARCH_PAGE, {
    headers: SCRAPER_HEADERS,
    redirect: "follow",
  });

  const setCookieHeader = sessionResp.headers.get("set-cookie") || "";
  const phpSessMatch = setCookieHeader.match(/PHPSESSID=([^;]+)/);
  const phpSessId = phpSessMatch ? phpSessMatch[1] : "";

  if (!phpSessId) {
    throw new Error("Não foi possível obter sessão PHP do portal TNU");
  }

  // Step 2: POST search
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
      ...SCRAPER_HEADERS,
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

  // Extract total results count
  const totalMatch = html.match(/Documento \d+ de (\d+)/);
  const totalResultados = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  return { html, totalResultados };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
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

  // Auth
  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body = {};
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

  // Supabase client
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
    const acordaos = parseResultCards(html);

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

    const rows = acordaos.map((a) => ({
      numero_processo: a.numero_processo,
      tipo_documento: a.tipo_documento,
      uf: a.uf,
      data_julgamento: a.data_julgamento,
      data_publicacao: a.data_publicacao,
      relator: a.relator,
      decisao: a.decisao,
      ementa: a.ementa,
      inteiro_teor_url: a.inteiro_teor_url,
      source_url: a.source_url,
      tribunal: "TNU",
      tema: termo,
      embedding_status: "pending",
    }));

    const { data: upserted, error: upsertError } = await supabase
      .from("jurisprudences")
      .upsert(rows, {
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
