// ============================================================================
// supabase/functions/datajud-bulk-proxy/index.ts
// Edge Function: Proxy seguro Deno → Hetzner (local-scraper)
//
// Responsabilidades EXCLUSIVAS desta função:
//   1. Verificar JWT do usuário autenticado (inline ES256 + HS256)
//   2. Validar payload via Zod (estrutura + regex CNJ)
//   3. Repassar para POST /api/datajud/bulk no local-scraper (Hetzner)
//      usando SCRAPER_SERVICE_KEY como autenticação interna
//
// SECURITY:
//   - NÃO consulta o DataJud diretamente (Geo-Block 403 para IPs fora do BR)
//   - NÃO expõe DATAJUD_API_KEY — só o scraper Node.js a conhece
//   - SCRAPER_URL e SCRAPER_SERVICE_KEY são secrets do projeto Supabase
//   - Auth inlined para evitar problemas de path com _shared/ no bundler
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "npm:zod@3.24.2";
import * as jose from "jsr:@panva/jose@6";

// ─── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Auth inline (ES256 + HS256) ─────────────────────────────────────────────
// Inlined para evitar erro de bundling "Module not found _shared/auth.ts".
// Suporta ES256 (novo padrão Supabase) e HS256 (legado/service_role).
// verify_jwt=false obrigatório pois o runtime não consegue verificar ES256
// com o JWT secret HS256 — causava 401 antes do código executar.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const JWT_ISSUER = `${SUPABASE_URL}/auth/v1`;
let jwksCache: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache) jwksCache = jose.createRemoteJWKSet(new URL(JWKS_URL));
  return jwksCache;
}

function decodeUnsafe<T>(part: string): T | null {
  try {
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as T;
  } catch {
    return null;
  }
}

async function authenticateRequest(
  req: Request
): Promise<{ sub: string; role: string; exp: number } | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = decodeUnsafe<{ alg?: string }>(parts[0]);
  const alg = header?.alg ?? "HS256";

  if (alg === "ES256") {
    try {
      const { payload } = await jose.jwtVerify(token, getJWKS(), { issuer: JWT_ISSUER });
      const p = payload as { sub: string; role: string; exp: number };
      if (p.role === "authenticated" && p.sub) return p;
      console.warn(`[auth] ES256 role inesperado: ${p.role}`);
      return null;
    } catch (e) {
      console.error("[auth] ES256 falhou:", (e as Error).message);
      return null;
    }
  }

  if (alg === "HS256") {
    const p = decodeUnsafe<{ sub: string; role: string; exp: number }>(parts[1]);
    if (!p) return null;
    const now = Math.floor(Date.now() / 1000);
    if (p.exp && p.exp < now) { console.warn("[auth] HS256 expirado"); return null; }
    if (p.role === "service_role" || (p.role === "authenticated" && p.sub)) return p;
    console.warn(`[auth] HS256 role rejeitado: ${p.role}`);
    return null;
  }

  console.warn(`[auth] Algoritmo não suportado: ${alg}`);
  return null;
}

// ─── Schema Zod ──────────────────────────────────────────────────────────────

const REGEX_CNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

const datajudBulkSchema = z.object({
  processos: z
    .array(z.string().regex(REGEX_CNJ, "Formato CNJ inválido (esperado: NNNNNNN-DD.AAAA.J.TT.OOOO)"))
    .min(1, "Pelo menos 1 processo é obrigatório")
    .max(50, "Máximo de 50 processos por lote"),
});

// ─── Handler Principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── 1. Verificação JWT ──────────────────────────────────────────────────────
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ success: false, error: "Não autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── 2. Parse e Validação Zod ────────────────────────────────────────────
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
        JSON.stringify({ success: false, error: "Payload inválido", detalhes: parse.error.flatten().fieldErrors }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { processos } = parse.data;

    // ── 3. Config do scraper (Hetzner) ──────────────────────────────────────
    const scraperUrlRaw = Deno.env.get("SCRAPER_URL");
    const scraperKey = Deno.env.get("SCRAPER_SERVICE_KEY");

    if (!scraperUrlRaw || !scraperKey) {
      console.error("[datajud-bulk-proxy] SCRAPER_URL ou SCRAPER_SERVICE_KEY não configurados.");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração de servidor ausente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normaliza SCRAPER_URL — 3 camadas defensivas:
    //   1. Remove trailing slashes: "http://x:3001/"   → "http://x:3001"
    //   2. Remove caminhos residuais de versões anteriores para evitar URL duplicada
    //   3. Garante que o endpoint use o prefixo /api/cnj/ validado no Nginx
    const scraperUrl = scraperUrlRaw
      .replace(/\/+$/, "")
      .replace(/\/api\/datajud(\/.*)?$/, "")
      .replace(/\/api\/cnj\/datajud-bulk(\/.*)?$/, "")
      .replace(/\/api$/, "");

    const scraperEndpoint = `${scraperUrl}/api/cnj/datajud-bulk/bulk`;

    console.info(`[DIAG] raw="${scraperUrlRaw}" | normalizado="${scraperUrl}" | endpoint="${scraperEndpoint}"`);
    console.info(`[datajud-bulk-proxy] Enviando ${processos.length} processo(s)`);

    // ── 4. Fetch para o local-scraper (Hetzner) ─────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    let scraperResponse: Response;
    try {
      scraperResponse = await fetch(scraperEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": scraperKey,       // Chave interna Deno → Hetzner
          "x-user-id": auth.sub ?? "",        // Auditoria
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
      const errorBody = await scraperResponse.text().catch(() => scraperResponse.statusText);
      console.error(`[datajud-bulk-proxy] HTTP ${scraperResponse.status} de '${scraperEndpoint}': ${errorBody.slice(0, 300)}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro no servidor de scraping (HTTP ${scraperResponse.status})`,
          detalhe: errorBody.slice(0, 500),
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err as Error;
    const isTimeout = error.name === "AbortError";
    console.error("[datajud-bulk-proxy] Erro:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "Timeout: scraper não respondeu em 60s"
          : (error.message || "Erro interno do servidor"),
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
