// ============================================================================
// supabase/functions/datajud-bulk-proxy/index.ts
// Edge Function: Proxy seguro Deno → Hetzner (local-scraper)
//
// Responsabilidades EXCLUSIVAS desta função:
//   1. Verificar JWT do usuário autenticado (authenticateRequest)
//   2. Validar payload via Zod (estrutura + regex CNJ)
//   3. Repassar para POST /api/datajud/bulk no local-scraper (Hetzner)
//      usando SCRAPER_SERVICE_KEY como autenticação interna
//
// SECURITY:
//   - NÃO consulta o DataJud diretamente (Geo-Block 403 para IPs fora do BR)
//   - NÃO expõe DATAJUD_API_KEY — só o scraper Node.js a conhece
//   - SCRAPER_URL e SCRAPER_SERVICE_KEY são secrets do projeto Supabase
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "npm:zod@3.24.2";
import { authenticateRequest } from "../_shared/auth.ts";

// ─── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://rafaelavasconcelos.adv.br",
  "https://www.rafaelavasconcelos.adv.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ─── Schema Zod de Validação (espelha datajudBulkSchema no frontend) ─────────

const REGEX_CNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

const datajudBulkSchema = z.object({
  processos: z
    .array(
      z.string().regex(REGEX_CNJ, "Formato CNJ inválido (esperado: NNNNNNN-DD.AAAA.J.TT.OOOO)")
    )
    .min(1, "Pelo menos 1 processo é obrigatório")
    .max(50, "Máximo de 50 processos por lote"),
});

// ─── Handler Principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── 1. Verificação JWT ────────────────────────────────────────────────────
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ success: false, error: "Não autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── 2. Parse e Validação Zod ──────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Body JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parse = datajudBulkSchema.safeParse(body);
    if (!parse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payload inválido",
          detalhes: parse.error.flatten().fieldErrors,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { processos } = parse.data;

    // ── 3. Config do scraper (Hetzner) ────────────────────────────────────
    const scraperUrl = Deno.env.get("SCRAPER_URL");
    const scraperKey = Deno.env.get("SCRAPER_SERVICE_KEY");

    if (!scraperUrl || !scraperKey) {
      console.error("[datajud-bulk-proxy] SCRAPER_URL ou SCRAPER_SERVICE_KEY não configurados.");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração de servidor ausente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Repassa para o local-scraper (Hetzner) via POST seguro ────────
    const scraperEndpoint = `${scraperUrl}/api/datajud/bulk`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s para lotes grandes

    let scraperResponse: Response;
    try {
      scraperResponse = await fetch(scraperEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": scraperKey,      // Chave interna Deno → Hetzner
          "x-user-id": auth.sub ?? "",       // Auditoria: quem disparou
        },
        body: JSON.stringify({
          processos: processos.map((numeroCNJ) => ({ numeroCNJ })),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!scraperResponse.ok) {
      const errorText = await scraperResponse
        .text()
        .catch(() => scraperResponse.statusText);
      console.error(
        `[datajud-bulk-proxy] Scraper retornou ${scraperResponse.status}: ${errorText}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro no servidor de scraping (${scraperResponse.status})`,
        }),
        {
          status: scraperResponse.status >= 500 ? 502 : scraperResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resultado = await scraperResponse.json();

    return new Response(
      JSON.stringify({ success: true, data: resultado }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const error = err as Error;
    const isTimeout = error.name === "AbortError";
    console.error("[datajud-bulk-proxy] Erro:", error.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "Timeout: scraper não respondeu em 60s (lote pode ser muito grande)"
          : error.message || "Erro interno do servidor",
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
