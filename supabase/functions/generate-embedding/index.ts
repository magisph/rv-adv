// ============================================================================
// Supabase Edge Function: generate-embedding
// Gera embeddings vetoriais via Gemini API (gemini-embedding-001, 3072 dims).
// Skill: backend-security-coder (JWT auth, input validation, error sanitization)
// Skill: api-security-best-practices (CORS restrito, rate limiting, timeout)
// Deploy: npx supabase functions deploy generate-embedding
// fix(Bug #6): migrado de serve() std@0.177.0 (deprecated) para Deno.serve() nativo
// ============================================================================
import { authenticateRequest } from "../_shared/auth.ts";

// ─── Configuração ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

// Limites de segurança — api-security-best-practices
const MAX_TEXT_LENGTH = 25_000;  // ~6.000 tokens (limite do embedding-001)
const EMBEDDING_TIMEOUT_MS = 15_000;

// ─── CORS — restrito ao mesmo conjunto de origens do ai-proxy ─────────────────

const ALLOWED_ORIGINS = [
  "https://rv-adv.app",
  "https://www.rv-adv.app",
  "https://rafaelavasconcelos.adv.br",
  "https://www.rafaelavasconcelos.adv.br",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ─── JWT Auth — via _shared/auth.ts ─────────────────────────────────────────────────────────────────


// ─── Resposta de erro sanitizada ─────────────────────────────────────────────
// backend-security-coder: nunca vaza stack traces ou detalhes internos

function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Apenas POST
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  // 1. Autenticação JWT obrigatória
  const auth = await authenticateRequest(req);
  if (!auth) {
    return errorResponse("Unauthorized", 401, corsHeaders);
  }

  // 2. Validação da chave Gemini (falha rápida antes de processar input)
  if (!GEMINI_API_KEY) {
    console.error("[generate-embedding] GEMINI_API_KEY não configurada.");
    return errorResponse("Serviço de embeddings indisponível", 503, corsHeaders);
  }

  // 3. Parse e validação do body
  let body: { text?: unknown; taskType?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body JSON inválido", 400, corsHeaders);
  }

  const { text, taskType = "RETRIEVAL_DOCUMENT" } = body;

  if (typeof text !== "string" || text.trim().length === 0) {
    return errorResponse("Campo 'text' é obrigatório e deve ser uma string não vazia", 400, corsHeaders);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return errorResponse(
      `Texto excede o limite de ${MAX_TEXT_LENGTH} caracteres`,
      400,
      corsHeaders
    );
  }

  // taskType deve ser um dos valores válidos do Gemini
  const VALID_TASK_TYPES = [
    "RETRIEVAL_QUERY",
    "RETRIEVAL_DOCUMENT",
    "SEMANTIC_SIMILARITY",
    "CLASSIFICATION",
    "CLUSTERING",
  ];
  const resolvedTaskType = VALID_TASK_TYPES.includes(String(taskType))
    ? String(taskType)
    : "RETRIEVAL_DOCUMENT";

  // 4. Chamada à API Gemini com timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

  try {
    const geminiResponse = await fetch(
      `${GEMINI_EMBEDDING_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: text.trim() }] },
          taskType: resolvedTaskType,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!geminiResponse.ok) {
      // Loga o erro real internamente, mas não o expõe ao cliente
      const errBody = await geminiResponse.text();
      console.error(`[generate-embedding] Gemini API error (${geminiResponse.status}):`, errBody);
      return errorResponse("Falha ao gerar embedding", 502, corsHeaders);
    }

    const data = await geminiResponse.json();
    const embedding: number[] | undefined = data?.embedding?.values;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.error("[generate-embedding] Resposta Gemini sem embedding:", JSON.stringify(data));
      return errorResponse("Resposta inválida da API de embeddings", 502, corsHeaders);
    }

    return new Response(
      JSON.stringify({ embedding, dimensions: embedding.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return errorResponse("Timeout na geração de embedding", 504, corsHeaders);
    }
    // Loga o erro real, mas não o vaza para o cliente
    console.error("[generate-embedding] Erro inesperado:", err);
    return errorResponse("Erro interno no servidor", 500, corsHeaders);
  }
});
