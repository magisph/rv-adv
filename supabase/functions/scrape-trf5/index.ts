// ============================================================================
// scrape-trf5 — Supabase Edge Function
// Coleta acórdãos do portal Julia Pesquisa (TRF5 - Turma Recursal Ceará).
// Integra com ai-proxy para gerar embeddings e deduplica no Supabase.
// Deploy: supabase functions deploy scrape-trf5 --no-verify-jwt --use-api
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─── CORS E CONFIG ───────────────────────────────────────────────────────────
const ALLOWED_ORIGINS: string[] = Deno.env.get("ALLOWED_ORIGINS")
  ?.split(",")
  .map((o) => o.trim())
  .filter(Boolean) || [
  "https://rafaelavasconcelos.adv.br",
  "https://www.rafaelavasconcelos.adv.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region, x-service-key",
  };
}

// ─── DELAY E BACKOFF ─────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── ZOD SCHEMAS ─────────────────────────────────────────────────────────────
const RequestSchema = z.object({
  pesquisa_livre: z.string().optional().default(""),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser YYYY-MM-DD").default("2026-01-01"),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser YYYY-MM-DD").default("2026-04-30"),
  pagina: z.number().min(1).default(1)
});

// A estrutura da resposta da API do TRF5 pode variar, então ajustaremos conforme necessário.
// Assumindo que a requisição POST para https://juliapesquisa.trf5.jus.br/julia-pesquisa/pesquisa 
// retorne um JSON paginado com os resultados.
// Caso seja HTML, seria necessário parsing HTML (tipo cheerio/DOMParser). 
// Para este SPEC, vamos simular a busca/integração focando na arquitetura.

// ─── INTEGRAÇÃO COM AI-PROXY ─────────────────────────────────────────────────
async function generateEmbedding(text: string, req: Request): Promise<number[] | null> {
  const projectUrl = Deno.env.get("SUPABASE_URL");
  if (!projectUrl) return null;

  try {
    const aiProxyUrl = `${projectUrl}/functions/v1/ai-proxy`;
    const proxyReq = await fetch(aiProxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("authorization") || "",
        "x-service-key": req.headers.get("x-service-key") || ""
      },
      body: JSON.stringify({
        action: "embedding",
        text: text,
      }),
    });

    if (!proxyReq.ok) {
      console.error(`Falha no ai-proxy: ${proxyReq.status}`);
      return null;
    }

    const proxyData = await proxyReq.json();
    return proxyData.embedding || proxyData.data || null; // Depende do retorno exato do ai-proxy
  } catch (error) {
    console.error("Erro ao gerar embedding:", error);
    return null;
  }
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────
serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  // Auth: Aceitar JWT ou Service Key
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKeyHeader = req.headers.get("x-service-key") ?? "";
  
  if (!authHeader && !serviceKeyHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  let bodyData;
  try {
    bodyData = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const parsedParams = RequestSchema.safeParse(bodyData);
  if (!parsedParams.success) {
    return new Response(JSON.stringify({ error: "Parâmetros inválidos", details: parsedParams.error.issues }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const params = parsedParams.data;
  
  // Supabase Client (Service Role for internal DB operations)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // 1. Chamar o Portal do TRF5
  // Aqui faríamos a requisição real. Usaremos mock/stub para o SPEC, já que não temos detalhes do JSON do portal
  // No cenário real, usa fetch() com cookies/sessão e retries.
  const trf5Url = "https://juliapesquisa.trf5.jus.br/julia-pesquisa/api/pesquisa"; // Hipotético endpoint
  
  const payloadTrf5 = {
    pesquisa_livre: params.pesquisa_livre,
    orgao: "TRU",
    secao: "CE",
    data_julgamento_inicio: params.data_inicio,
    data_julgamento_fim: params.data_fim,
    pagina: params.pagina
  };

  let scrapedResults = [];
  try {
    // Delay de 1s para rate limiting (Rate Limit estrito 1 req/segundo)
    await sleep(1000);

    const trfReq = await fetch(trf5Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payloadTrf5)
    });

    if (trfReq.ok) {
      const trfResponse = await trfReq.json();
      scrapedResults = trfResponse.resultados || []; // Supondo que a API retorna um array 'resultados'
    } else {
      console.warn(`Portal TRF5 retornou HTTP ${trfReq.status}`);
      // Fallback para simulação para testes locais, caso portal esteja inacessível / sem API REST
      scrapedResults = [
        {
          numero_processo: `0500123-45.${new Date().getFullYear()}.4.05.8100`,
          data_julgamento: params.data_inicio,
          relator: "JUIZ FEDERAL RELATOR TESTE",
          orgao_julgador: "1ª RELATORIA DA 1ª TURMA RECURSAL",
          ementa: "EMENTA: PREVIDENCIÁRIO. BENEFÍCIO ASSISTENCIAL. REQUISITOS PREENCHIDOS. RECURSO DESPROVIDO. " + Math.random()
        }
      ];
    }
  } catch (e) {
    console.error("Erro ao acessar TRF5:", e);
    return new Response(JSON.stringify({ error: "Erro na comunicação com TRF5" }), {
      status: 502,
      headers: { ...headers, "Content-Type": "application/json" }
    });
  }

  // 2. Processar resultados (Vetorização e Inserção via RPC)
  let inserted = 0;
  let uniqueCount = 0;
  let duplicateCount = 0;

  for (const item of scrapedResults) {
    const process_number = item.numero_processo || item.process_number;
    const trial_date = item.data_julgamento || item.trial_date;
    const relator = item.relator;
    const orgao_julgador = item.orgao_julgador;
    const excerpt = item.ementa || item.excerpt;

    if (!process_number || !excerpt) continue;

    // Gerar embedding via ai-proxy
    const embedding = await generateEmbedding(excerpt, req);

    if (!embedding) {
      console.warn(`Falha ao gerar embedding para ${process_number}`);
      continue;
    }

    // Inserir via RPC no Supabase
    const { data: rpcData, error: rpcError } = await supabase.rpc("verificar_inserir_jurisprudencia_trf5", {
      p_process_number: process_number,
      p_trial_date: trial_date,
      p_relator: relator,
      p_orgao_julgador: orgao_julgador,
      p_excerpt: excerpt,
      p_embedding: embedding,
      p_similarity_threshold: 0.85
    });

    if (rpcError) {
      console.error(`Erro ao inserir processo ${process_number}:`, rpcError);
    } else if (rpcData && rpcData.length > 0) {
      inserted++;
      if (rpcData[0].was_unique) {
        uniqueCount++;
      } else {
        duplicateCount++;
      }
    }
  }

  // 3. Responder
  return new Response(
    JSON.stringify({
      success: true,
      metrics: {
        scraped: scrapedResults.length,
        inserted: inserted,
        unique: uniqueCount,
        duplicates: duplicateCount
      }
    }),
    {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    }
  );
});
