// ============================================
// Supabase Edge Function: djen-bypass
// Proxy seguro para a API PÚBLICA do DJEN (CNJ).
// Elimina dependência do proxy reverso externo e resolve
// Mixed Content (HTTP vs HTTPS) e Geo-Block (403).
//
// AUTH: JWT validado nativamente pelo Supabase Edge Runtime
//       (deploy SEM --no-verify-jwt). Nenhuma revalidação manual.
//
// DJEN: Endpoint PÚBLICO do WSO2 Gateway do CNJ.
//       O WSO2 rejeita a requisição com 401 se QUALQUER header
//       Authorization estiver presente (APIKey, Bearer, etc.).
//       NENHUM header de autenticação é enviado ao CNJ.
//
// Deploy: npx supabase functions deploy djen-bypass
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ============================================
// CORS — restrito ao domínio de produção + localhost dev
// ============================================
const ALLOWED_ORIGINS = [
  "https://rafaelavasconcelos.adv.br",
  "https://www.rafaelavasconcelos.adv.br",
  "https://rv-adv.app",
  "https://www.rv-adv.app",
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
// DJEN API — Comunicações públicas do PJe (sem autenticação)
// ============================================
const DJEN_API_BASE = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";

// ============================================
// Main serve handler
// ============================================
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método não permitido" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // AUTH: JWT já validado pelo Supabase Edge Runtime na porta de entrada.
  // Nenhuma revalidação manual necessária aqui.

  try {
    // Parse body — parâmetros vindos do frontend
    const body = await req.json();
    const {
      numeroOab,
      ufOab,
      nomeAdvogado,
      dataDisponibilizacaoInicio,
      dataDisponibilizacaoFim,
    } = body as {
      numeroOab?: string;
      ufOab?: string;
      nomeAdvogado?: string;
      dataDisponibilizacaoInicio?: string;
      dataDisponibilizacaoFim?: string;
    };

    if (!numeroOab || !ufOab) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Campos obrigatórios ausentes: 'numeroOab' e 'ufOab'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Monta query string para a API pública do DJEN
    const params = new URLSearchParams();
    params.set("numeroOab", numeroOab);
    params.set("ufOab", ufOab);
    if (nomeAdvogado) params.set("nomeAdvogado", nomeAdvogado);
    if (dataDisponibilizacaoInicio)
      params.set("dataDisponibilizacaoInicio", dataDisponibilizacaoInicio);
    if (dataDisponibilizacaoFim)
      params.set("dataDisponibilizacaoFim", dataDisponibilizacaoFim);

    const djenUrl = `${DJEN_API_BASE}?${params.toString()}`;

    // Timeout de 30s para a chamada externa
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    // CRÍTICO: O WSO2 Gateway do CNJ é PÚBLICO e rejeita com 401
    // QUALQUER header Authorization (APIKey ou Bearer JWT).
    // O objeto headers deve conter SOMENTE o mínimo necessário.
    let djenResponse: Response;
    try {
      djenResponse = await fetch(djenUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!djenResponse.ok) {
      const errorText = await djenResponse
        .text()
        .catch(() => djenResponse.statusText);
      console.error(
        `[djen-bypass] DJEN ${djenResponse.status}: ${errorText}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `DJEN retornou ${djenResponse.status}: ${errorText}`,
        }),
        {
          status: djenResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const djenJson = await djenResponse.json();

    return new Response(JSON.stringify({ success: true, data: djenJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    const isTimeout = err.name === "AbortError";
    console.error("[djen-bypass] Erro:", err.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout
          ? "Timeout: DJEN não respondeu em 30s"
          : err.message || "Erro interno do servidor",
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
