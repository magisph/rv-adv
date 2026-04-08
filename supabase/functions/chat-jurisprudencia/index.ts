// ============================================================================
// Supabase Edge Function: chat-jurisprudencia
// RAG (Retrieval-Augmented Generation) sobre a base de jurisprudência da TNU.
//
// Fluxo v2 (com memória):
//   query + sessionId? → histórico? → embedding → vetorial → contexto+histórico
//   → Gemini Pro → gravar msgs → resposta
//
// Novidades v2:
//   - Aceita `sessionId` opcional para carga de histórico de conversa
//   - Injeta histórico no array de messages antes de chamar o LLM
//   - Grava mensagens user+assistant após resposta (via service role)
//   - Retorna `sessionId` no response para que o frontend possa rastreá-lo
//
// Skill: backend-security-coder (JWT auth, input validation, prompt injection guard)
// Skill: api-security-best-practices (CORS restrito, timeout, rate limiting via JWT)
// Skill: llm-app-patterns (short-term memory injection, message array pattern)
// Deploy: npx supabase functions deploy chat-jurisprudencia
// ============================================================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { authenticateRequest } from "../_shared/auth.ts";

// ─── Configuração ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GEMINI_EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";
const GEMINI_CHAT_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

// Limites de segurança
const MAX_QUERY_LENGTH = 2_000;
const MAX_CONTEXT_RESULTS = 5;
const CHAT_TIMEOUT_MS = 45_000;
const EMBEDDING_TIMEOUT_MS = 15_000;
// Histório curto: últimas 10 trocas = 20 mensagens (user+assistant)
// Mantém contexto relevante sem explodir o context window do LLM
const MAX_HISTORY_MESSAGES = 20;

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
        taskType: "RETRIEVAL_QUERY",
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
  court_id: string | null;
  relator: string;
  tema: string;
  trial_date: string | null;
  publication_date: string;
  excerpt: string;
  full_text: string | null;
  pdf_path: string;
  similarity: number;
}

async function buscarContexto(
  embedding: number[],
  matchCount = MAX_CONTEXT_RESULTS
): Promise<JurisprudenciaResult[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc("buscar_jurisprudencia", {
    query_embedding: embedding,
    match_count: matchCount,
    similarity_threshold: 0.4,
  });

  if (error) {
    throw new Error(`Erro na busca vetorial: ${error.message}`);
  }

  return (data as JurisprudenciaResult[]) ?? [];
}

// ─── Carregar histórico da sessão ─────────────────────────────────────────────
// SECURITY: usa service role key para contornar RLS internamente.
// O user_id é sempre validado via auth.uid() — nunca de body externo.

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function carregarHistorico(
  sessionId: string,
  userId: string
): Promise<ChatMessage[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Valida que a sessão pertence ao usuário autenticado antes de carregar
  const { data: session } = await supabase
    .from("jurisprudencia_chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) {
    console.warn(`[chat-jurisprudencia] Session ${sessionId} not found for user ${userId}`);
    return [];
  }

  // Carrega as ÚLTIMAS N mensagens (mais recentes), depois inverte para ordem cronológica
  const { data: rawMessages, error } = await supabase
    .from("jurisprudencia_chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  if (error) {
    console.error(`[chat-jurisprudencia] Erro ao carregar histórico: ${error.message}`);
    return [];
  }

  const messages = (rawMessages as ChatMessage[]) ?? [];
  return messages.reverse();
}

// ─── Gravar mensagens user + assistant ───────────────────────────────────────
// Fire-and-forget com log de erro — não bloqueia a resposta ao usuário.

async function gravarMensagens(
  sessionId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase.from("jurisprudencia_chat_messages").insert([
    {
      session_id: sessionId,
      role: "user",
      content: userMessage,
    },
    {
      session_id: sessionId,
      role: "assistant",
      content: assistantResponse,
    },
  ]);

  if (error) {
    // Não lança exceção — a resposta ao usuário já foi enviada
    console.error(`[chat-jurisprudencia] Erro ao gravar mensagens: ${error.message}`);
  }
}

// ─── Montar prompt RAG com suporte a histórico ────────────────────────────────
// backend-security-coder: separa claramente dados do usuário do prompt do sistema
// para prevenir prompt injection. O histórico é injetado como array tipado,
// não como string concatenada — evita escape injection via histórico.

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em Direito Previdenciário brasileiro, com foco na jurisprudência da TNU (Turma Nacional de Uniformização dos Juizados Especiais Federais).

Responda às perguntas com base EXCLUSIVAMENTE nos acórdãos fornecidos. Se os acórdãos não forem suficientes para responder, informe isso claramente. Não invente jurisprudência. Cite os números dos processos relevantes quando aplicável.

Quando houver histórico de conversa, mantenha coerência com as respostas anteriores e não repita informações já fornecidas.`;

function montarContextoRAG(contexto: JurisprudenciaResult[]): string {
  if (contexto.length === 0) {
    return "Nenhum acórdão relevante encontrado na base de dados.";
  }

  return contexto
    .map((j, i) => {
      const data = j.publication_date ?? "data desconhecida";
      const relator = j.relator ?? "relator desconhecido";
      const tema = j.tema ?? "";
      const processo = j.process_number ?? "";
      const similaridade = j.similarity
        ? `(similaridade: ${(j.similarity * 100).toFixed(1)}%)`
        : "";

      return [
        `--- Acórdão ${i + 1} ${similaridade} ---`,
        `Processo: ${processo}`,
        `Data: ${data} | Relator: ${relator}`,
        tema ? `Tema: ${tema}` : "",
        `Ementa: ${j.excerpt ?? ""}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

// ─── Chamar Gemini Pro com array de messages (suporte a histórico) ────────────

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

async function gerarResposta(
  query: string,
  contexto: JurisprudenciaResult[],
  historico: ChatMessage[]
): Promise<string> {
  const contextBlock = montarContextoRAG(contexto);

  // Compõe o array de contents para a API Gemini
  // O system prompt é embutido como primeiro turno "user" pois a API Gemini
  // não tem campo system separado no endpoint generateContent (a não ser no SDK v2)
  const systemContent: GeminiContent = {
    role: "user",
    parts: [
      {
        text: `${SYSTEM_PROMPT}\n\n[ACÓRDÃOS DA BASE DE DADOS PARA ESTA PERGUNTA]\n${contextBlock}`,
      },
    ],
  };

  // Resposta fictícia do modelo reconhecendo o contexto (required para multi-turn)
  const systemAck: GeminiContent = {
    role: "model",
    parts: [{ text: "Entendido. Analisarei as perguntas com base exclusivamente nos acórdãos fornecidos." }],
  };

  // Mapeia o histórico: 'user' → 'user', 'assistant' → 'model'
  const historyContents: GeminiContent[] = historico.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Pergunta atual do usuário
  const currentQuestion: GeminiContent = {
    role: "user",
    parts: [{ text: query }],
  };

  const contents: GeminiContent[] = [
    systemContent,
    systemAck,
    ...historyContents,
    currentQuestion,
  ];

  const response = await fetchWithTimeout(
    `${GEMINI_CHAT_URL}?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
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

  // 1. Autenticação JWT obrigatória — extrai user_id do token verificado
  const auth = await authenticateRequest(req);
  if (!auth) {
    return errorResponse("Unauthorized", 401, corsHeaders);
  }
  const userId = auth.sub; // nunca vem do body — sempre do JWT verificado

  // 2. Verificação de chave Gemini
  if (!GEMINI_API_KEY) {
    console.error("[chat-jurisprudencia] GEMINI_API_KEY não configurada.");
    return errorResponse("Serviço de IA indisponível", 503, corsHeaders);
  }

  // 3. Parse e validação do body
  let body: { query?: unknown; matchCount?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Body JSON inválido", 400, corsHeaders);
  }

  const { query, matchCount, sessionId } = body;

  if (typeof query !== "string" || query.trim().length === 0) {
    return errorResponse(
      "Campo 'query' é obrigatório e deve ser uma string não vazia",
      400,
      corsHeaders
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return errorResponse(
      `Query excede o limite de ${MAX_QUERY_LENGTH} caracteres`,
      400,
      corsHeaders
    );
  }

  // Validação do sessionId: deve ser UUID válido ou omitido/null
  const resolvedSessionId: string | null =
    typeof sessionId === "string" && sessionId.trim().length > 0
      ? sessionId.trim()
      : null;

  const resolvedMatchCount =
    typeof matchCount === "number" && matchCount > 0 && matchCount <= 10
      ? matchCount
      : MAX_CONTEXT_RESULTS;

  // 4. Pipeline RAG com Memória
  try {
    // 4a. Carregar histórico da sessão (se houver sessionId)
    let historico: ChatMessage[] = [];
    if (resolvedSessionId) {
      historico = await carregarHistorico(resolvedSessionId, userId);
      console.log(
        `[chat-jurisprudencia] Histórico carregado: ${historico.length} msgs para sessão ${resolvedSessionId}`
      );
    }

    // 4b. Gerar embedding da query atual
    const embedding = await gerarEmbedding(query.trim());

    // 4c. Busca vetorial no Supabase
    const contexto = await buscarContexto(embedding, resolvedMatchCount);

    // 4d. Gerar resposta com histórico injetado
    const resposta = await gerarResposta(query.trim(), contexto, historico);

    // 4e. Gravar mensagens na sessão (se houver sessionId)
    // Feito em background — não bloqueia a resposta
    if (resolvedSessionId) {
      gravarMensagens(resolvedSessionId, query.trim(), resposta).catch((e) =>
        console.error("[chat-jurisprudencia] Falha ao gravar mensagens:", e)
      );
    }

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
        sessionId: resolvedSessionId, // retorna para o frontend rastrear
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
