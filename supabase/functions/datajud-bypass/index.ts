// ============================================
// Supabase Edge Function: datajud-bypass
// Proxy seguro para a API oficial do DataJud (CNJ / WSO2).
// Elimina dependência do sidecar Node.js local (localhost:3001).
// Deploy: npx supabase functions deploy datajud-bypass
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { authenticateRequest } from "../_shared/auth.ts";

// ============================================
// CORS — restrito ao domínio de produção + localhost dev
// ============================================
const ALLOWED_ORIGINS = [
  "https://rv-adv.app",
  "https://www.rv-adv.app",
  "https://rafaelavasconcelos.adv.br",
  "https://www.rafaelavasconcelos.adv.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
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

// ============================================
// authenticateRequest imported from _shared/auth.ts

// ============================================
// Mapeamento de tribunal → endpoint DataJud
// WSO2 gateway do CNJ — POST com query ElasticSearch
// ============================================
const DATAJUD_BASE =
  "https://api-publica.datajud.cnj.jus.br/api_publica_";

const TRIBUNAL_ENDPOINT_MAP: Record<string, string> = {
  TJCE: "tjce",
  TRF5: "trf5",
};

// ============================================
// Main serve handler
// ============================================
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 🔒 JWT Authentication Gate
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse body
    const body = await req.json();
    const { sigla, numeroFormatado } = body as {
      sigla?: string;
      numeroFormatado?: string;
    };

    if (!sigla || !numeroFormatado) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Campos obrigatórios ausentes: 'sigla' e 'numeroFormatado'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Resolve endpoint para o tribunal
    const tribunalSlug = TRIBUNAL_ENDPOINT_MAP[sigla.toUpperCase()];
    if (!tribunalSlug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Tribunal não suportado pelo bypass: ${sigla}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("DATAJUD_API_KEY");
    if (!apiKey) {
      console.error("[datajud-bypass] DATAJUD_API_KEY não configurada.");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração de servidor ausente." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const datajudUrl = `${DATAJUD_BASE}${tribunalSlug}/_search`;

    // Query ElasticSearch padrão DataJud
    const queryPayload = {
      query: {
        match: {
          numeroProcesso: numeroFormatado,
        },
      },
    };

    // Timeout de 30s para a chamada externa
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let datajudResponse: Response;
    try {
      datajudResponse = await fetch(datajudUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `APIKey ${apiKey}`,
        },
        body: JSON.stringify(queryPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!datajudResponse.ok) {
      const errorText = await datajudResponse
        .text()
        .catch(() => datajudResponse.statusText);
      console.error(
        `[datajud-bypass] DataJud ${datajudResponse.status} para ${sigla}: ${errorText}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `DataJud retornou ${datajudResponse.status} para tribunal ${sigla}: ${errorText}`,
        }),
        {
          status: datajudResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const datajudJson = await datajudResponse.json();

    return new Response(JSON.stringify({ success: true, data: datajudJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    const isTimeout = err.name === "AbortError";
    console.error("[datajud-bypass] Erro:", err.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "Timeout: DataJud não respondeu em 30s"
          : err.message || "Erro interno do servidor",
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
