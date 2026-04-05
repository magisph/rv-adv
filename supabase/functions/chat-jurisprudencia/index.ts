// ============================================================================
// Supabase Edge Function: chat-jurisprudencia
// RAG (Retrieval-Augmented Generation) sobre a base de jurisprudência da TNU.
// Fluxo: query → embedding → busca vetorial RPC → contexto → Gemini Pro → resposta
// Skill: backend-security-coder (JWT auth, input validation, prompt injection guard)
// Skill: api-security-best-practices (CORS restrito, timeout, rate limiting via JWT)
// Deploy: npx supabase functions deploy chat-jurisprudencia
// ============================================================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { authenticateRequest } from "../_shared/auth.ts";

// ─── Configuração ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const GEMINI_EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";
const GEMINI_CHAT_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

// Limites de segurança
const MAX_QUERY_LENGTH = 2_000;
const MAX_CONTEXT_RESULTS = 5;
const CHAT_TIMEOUT_MS = 45_000;
const EMBEDDING_TIMEOUT_MS = 15_000;

// ─── CORS ─────────────────────────────────────────────────────────────────────

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

//// ─── JWT Auth — via _shared/auth.ts ─────────────────────────────────────────


// ─── Resposta de erro sanitizada ─────────────────────────────────────────────

function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// ─── Fetch com timeout ────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Gerar embedding da query ─────────────────────────────────────────────────

async function gerarEmbedding(query: string): Promise<number[]> {
  const response = await fetchWithTimeout(
    `${GEMINI_EMBEDDING_URL}?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: query }] },
        taskType: "RETRIEVAL_QUERY", // Query mode para busca semântica
      }),
    },
    EMBEDDING_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Gemini Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  const embedding: number[] = data?.embedding?.values;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding vazio retornado pela API Gemini");
  }

  return embedding;
}

// ─── Busca vetorial no Supabase ───────────────────────────────────────────────

interface JurisprudenciaResult {
  id: string;
  process_number: string;
  publication_date: string;
  relator: string;
  tema: string;
  excerpt: string;
  pdf_path: string;
  similarity: number;
}

async function buscarContexto(
  embedding: number[],
  matchCount = MAX_CONTEXT_RESULTS
): Promise<JurisprudenciaResult[]> {
  // Usa Service Role Key para a busca vetorial (contorna RLS para leitura interna)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc("buscar_jurisprudencia", {
    query_embedding: embedding,
    match_count: matchCount,
    similarity_threshold: 0.4, // Threshold mais baixo para RAG (contexto amplo)
  });

  if (error) {
    throw new Error(`Erro na busca vetorial: ${error.message}`);
  }

  return (data as JurisprudenciaResult[]) ?? [];
}

// ─── Montar prompt RAG ────────────────────────────────────────────────────────
// backend-security-coder: separa claramente dados do usuário do prompt do sistema
// para prevenir prompt injection

function montarPromptRAG(query: string, contexto: JurisprudenciaResult[]): string {
  const contextoParts = contexto.map((j, i) => {
    const data = j.publication_date ?? "data desconhecida";
    const relator = j.relator ?? "relator desconhecido";
    const tema = j.tema ?? "";
    const processo = j.process_number ?? "";
    const similaridade = j.similarity ? `(similaridade: ${(j.similarity * 100).toFixed(1)}%)` : "";

    return [
      `--- Acórdão ${i + 1} ${similaridade} ---`,
      `Processo: ${processo}`,
      `Data: ${data} | Relator: ${relator}`,
      tema ? `Tema: ${tema}` : "",
      `Ementa: ${j.excerpt ?? ""}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const contextBlock =
    contexto.length > 0
      ? contextoParts.join("\n\n")
      : "Nenhum acórdão relevante encontrado na base de dados.";

  // O bloco [PERGUNTA DO USUÁRIO] é explicitamente delimitado para prevenir injeção
  return `Você é um assistente jurídico especializado em Direito Previdenciário brasileiro, com foco na jurisprudência da TNU (Turma Nacional de Uniformização dos Juizados Especiais Federais).

Responda à pergunta do usuário com base EXCLUSIVAMENTE nos acórdãos fornecidos abaixo. Se os acórdãos não forem suficientes para responder, informe isso claramente. Não invente jurisprudência. Cite os números dos processos relevantes.

[ACÓRDÃOS DA BASE DE DADOS]
${contextBlock}

[PERGUNTA DO USUÁRIO]
${query}

[RESPOSTA]`;
}

// ─── Chamar Gemini Pro para geração ──────────────────────────────────────────

async function gerarResposta(prompt: string): Promise<string> {
  const response = await fetchWithTimeout(
    `${GEMINI_CHAT_URL}?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,     // Baixa temperatura para respostas jurídicas precisas
          maxOutputTokens: 2048,
          topP: 0.8,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    },
    CHAT_TIMEOUT_MS
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[chat-jurisprudencia] Gemini Chat API error (${response.status}):`, errBody);
    throw new Error(`Gemini Chat API error: ${response.status}`);
  }

  const data = await response.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Resposta vazia da API Gemini");
  }

  return text;
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  // 1. Autenticação JWT obrigatória
  const auth = await authenticateRequest(req);
  if (!auth) {
    return errorResponse("Unauthorized", 401, corsHeaders);
  }

  // 2. Verificação de chave Gemini
  if (!GEMINI_API_KEY) {
    console.error("[chat-jurisprudencia] GEMINI_API_KEY não configurada.");
    return errorResponse("Serviço de IA indisponível", 503, corsHeaders);
  }

  // 3. Parse e validação do body
  let body: { query?: unknown; matchCount?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body JSON inválido", 400, corsHeaders);
  }

  const { query, matchCount } = body;

  if (typeof query !== "string" || query.trim().length === 0) {
    return errorResponse("Campo 'query' é obrigatório e deve ser uma string não vazia", 400, corsHeaders);
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return errorResponse(
      `Query excede o limite de ${MAX_QUERY_LENGTH} caracteres`,
      400,
      corsHeaders
    );
  }

  const resolvedMatchCount =
    typeof matchCount === "number" && matchCount > 0 && matchCount <= 10
      ? matchCount
      : MAX_CONTEXT_RESULTS;

  // 4. Pipeline RAG
  try {
    // 4a. Gerar embedding da query
    const embedding = await gerarEmbedding(query.trim());

    // 4b. Busca vetorial no Supabase
    const contexto = await buscarContexto(embedding, resolvedMatchCount);

    // 4c. Montar prompt RAG e gerar resposta
    const prompt = montarPromptRAG(query.trim(), contexto);
    const resposta = await gerarResposta(prompt);

    return new Response(
      JSON.stringify({
        resposta,
        fontes: contexto.map((j) => ({
          id: j.id,
          process_number: j.process_number,
          publication_date: j.publication_date,
          relator: j.relator,
          tema: j.tema,
          similarity: j.similarity,
          pdf_path: j.pdf_path,
        })),
        totalFontes: contexto.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return errorResponse("Timeout na geração de resposta", 504, corsHeaders);
    }
    console.error("[chat-jurisprudencia] Erro no pipeline RAG:", err);
    return errorResponse("Erro ao processar consulta jurisprudencial", 500, corsHeaders);
  }
});
