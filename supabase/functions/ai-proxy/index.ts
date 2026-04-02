// ============================================
// Supabase Edge Function: ai-proxy
// Centraliza todas as chamadas de IA server-side.
// Elimina exposição de chaves de API no frontend.
// Deploy: npx supabase functions deploy ai-proxy
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ============================================
// JWT Auth — valida token antes de processar
// ============================================
async function authenticateRequest(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { userId: user.id };
}

// ============================================
// Timeout helper — AbortController com deadline
// ============================================
const AI_TIMEOUT_MS = 45_000; // 45 segundos

function createTimeoutSignal(ms: number = AI_TIMEOUT_MS): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
}

// ============================================
// Provider configurations (read from Deno env)
// ============================================

function getProviders() {
  return {
    GROQ: {
      baseUrl:
        Deno.env.get("GROQ_BASE_URL") || "https://api.groq.com/openai/v1",
      apiKey: Deno.env.get("GROQ_API_KEY") || "",
      defaultModel: Deno.env.get("MODEL_WRITER") || "llama-3.3-70b-versatile",
    },
    OPENROUTER: {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: Deno.env.get("OPENROUTER_API_KEY") || "",
      defaultModel: "deepseek/deepseek-r1",
    },
    GEMINI: {
      baseUrl:
        Deno.env.get("GEMINI_BASE_URL") ||
        "https://generativelanguage.googleapis.com/v1beta",
      apiKey: Deno.env.get("GEMINI_API_KEY") || "",
      defaultModel: Deno.env.get("MODEL_VISION") || "gemini-2.5-flash",
    },
    COHERE: {
      baseUrl: "https://api.cohere.ai/v1",
      apiKey: Deno.env.get("COHERE_API_KEY") || "",
      defaultModel: "command-r-plus",
    },
    NVIDIA: {
      baseUrl:
        Deno.env.get("NVIDIA_BASE_URL") ||
        "https://integrate.api.nvidia.com/v1",
      apiKey: Deno.env.get("NVIDIA_API_KEY") || "",
      defaultModel:
        Deno.env.get("MODEL_ANALYSIS") || "nvidia/nemotron-3-nano-30b-a3b",
    },
  };
}

// ============================================
// Internal helpers — API call wrappers
// ============================================

async function callGroq(
  prompt: string,
  systemPrompt: string | null,
  options: Record<string, unknown> = {}
): Promise<string> {
  const providers = getProviders();
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const { signal, clear } = createTimeoutSignal();
  try {
    const response = await fetch(
      `${providers.GROQ.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providers.GROQ.apiKey}`,
        },
        body: JSON.stringify({
          model: (options.model as string) || providers.GROQ.defaultModel,
          messages,
          temperature: (options.temperature as number) ?? 0.3,
          max_tokens: (options.max_tokens as number) ?? 4096,
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Groq ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } finally {
    clear();
  }
}

async function callOpenRouter(
  prompt: string,
  systemPrompt: string | null,
  options: Record<string, unknown> = {}
): Promise<string> {
  const providers = getProviders();
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const { signal, clear } = createTimeoutSignal();
  try {
    const response = await fetch(
      `${providers.OPENROUTER.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providers.OPENROUTER.apiKey}`,
          "HTTP-Referer": "https://rv-adv.app",
          "X-Title": "RV-Adv Legal System",
        },
        body: JSON.stringify({
          model:
            (options.model as string) || providers.OPENROUTER.defaultModel,
          messages,
          temperature: (options.temperature as number) ?? 0.3,
          max_tokens: (options.max_tokens as number) ?? 4096,
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenRouter ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } finally {
    clear();
  }
}

async function callGeminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const providers = getProviders();
  const apiKey = providers.GEMINI.apiKey;
  const model = providers.GEMINI.defaultModel;
  const url = `${providers.GEMINI.baseUrl}/models/${model}:generateContent`;

  const { signal, clear } = createTimeoutSignal(60_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Gemini ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } finally {
    clear();
  }
}

async function callOpenRouterVision(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const providers = getProviders();
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        },
      ],
    },
  ];

  const { signal, clear } = createTimeoutSignal(60_000);
  try {
    const response = await fetch(
      `${providers.OPENROUTER.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providers.OPENROUTER.apiKey}`,
          "HTTP-Referer": "https://rv-adv.app",
          "X-Title": "RV-Adv Legal System",
        },
        body: JSON.stringify({
          model: "qwen/qwen2.5-vl-72b-instruct",
          messages,
          max_tokens: 4096,
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenRouter Vision ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } finally {
    clear();
  }
}

async function callNVIDIA(
  prompt: string,
  systemPrompt: string | null
): Promise<string> {
  const providers = getProviders();
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const { signal, clear } = createTimeoutSignal();
  try {
    const response = await fetch(
      `${providers.NVIDIA.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providers.NVIDIA.apiKey}`,
        },
        body: JSON.stringify({
          model: providers.NVIDIA.defaultModel,
          messages,
          temperature: 0.3,
          max_tokens: 4096,
        }),
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`NVIDIA ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } finally {
    clear();
  }
}

async function callCohere(prompt: string): Promise<string> {
  const providers = getProviders();
  const { signal, clear } = createTimeoutSignal();
  try {
    const response = await fetch(`${providers.COHERE.baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providers.COHERE.apiKey}`,
      },
      body: JSON.stringify({
        model: providers.COHERE.defaultModel,
        prompt,
        max_tokens: 50,
        temperature: 0.1,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Cohere ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    return data.generations[0].text.trim().toLowerCase();
  } finally {
    clear();
  }
}

// ============================================
// Action handlers — port of frontend logic
// ============================================

interface RequestBody {
  action: string;
  prompt?: string;
  system_prompt?: string;
  options?: Record<string, unknown>;
  image_base64?: string;
  mime_type?: string;
  template?: string;
  variables?: Record<string, unknown>;
  document_type?: string;
  text?: string;
  process_data?: unknown;
  analysis_type?: string;
  response_json_schema?: unknown;
}

async function handleGenerate(body: RequestBody): Promise<string> {
  const systemPrompt =
    body.system_prompt ||
    `Você é um advogado experiente brasileiro.
Regras para geração de ${body.document_type || "peticao"}:
- Linguagem jurídica formal brasileira
- Estrutura processual correta
- Fundamentação legal adequada
- Terminologia técnica correta
- NUNCA invente legislação ou jurisprudência`;

  const prompt =
    body.prompt ||
    `Gere ${body.document_type || "peticao"} com:\nTemplate: ${body.template}\nDados: ${JSON.stringify(body.variables)}`;

  try {
    return await callGroq(prompt, systemPrompt, {
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 8192,
    });
  } catch (error) {
    console.warn("[ai-proxy] Groq falhou, tentando DeepSeek R1:", (error as Error).message);
    return await callOpenRouter(prompt, systemPrompt, {
      model: "deepseek/deepseek-r1",
      temperature: 0.3,
      max_tokens: 4096,
    });
  }
}

async function handleInvokeLLM(body: RequestBody): Promise<unknown> {
  const systemPrompt =
    body.system_prompt ||
    "Você é um assistente jurídico brasileiro experiente.";

  let fullPrompt = body.prompt || "";
  if (body.response_json_schema) {
    fullPrompt += `\n\nResponda EXCLUSIVAMENTE em JSON válido seguindo este schema:\n${JSON.stringify(body.response_json_schema)}`;
  }

  const options = body.options || {};

  try {
    const result = await callGroq(fullPrompt, systemPrompt, {
      model: options.model || "llama-3.3-70b-versatile",
      temperature: options.temperature || 0.3,
      max_tokens: options.max_tokens || 4096,
    });

    if (body.response_json_schema) {
      const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return result;
  } catch (error) {
    console.warn("[ai-proxy] Groq falhou, tentando OpenRouter:", (error as Error).message);
    const result = await callOpenRouter(fullPrompt, systemPrompt, {
      model: "deepseek/deepseek-r1",
      temperature: (options.temperature as number) || 0.3,
      max_tokens: (options.max_tokens as number) || 4096,
    });

    if (body.response_json_schema) {
      const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
    return result;
  }
}

async function handleOCR(body: RequestBody): Promise<string> {
  const prompt = `Extraia todo o texto deste documento jurídico.
Mantenha formatação (parágrafos, listas, tabelas).
Identifique campos: nome, CPF, data, valores.`;

  const imageBase64 = body.image_base64 || "";
  const mimeType = body.mime_type || "image/jpeg";

  try {
    return await callGeminiVision(prompt, imageBase64, mimeType);
  } catch (error) {
    console.warn("[ai-proxy] Gemini falhou, tentando Qwen2.5 VL:", (error as Error).message);
    return await callOpenRouterVision(prompt, imageBase64, mimeType);
  }
}

async function handleClassify(body: RequestBody): Promise<string> {
  const categories = [
    "pessoais", "inss", "medicos", "judicial",
    "peticao", "prova", "laudo", "contrato",
    "procuracao", "outros",
  ];

  const text = body.text || "";
  const prompt = `Classifique em UMA categoria: ${categories.join(", ")}.
Retorne APENAS o nome da categoria em minúsculas (uma única palavra).
Documento: ${text.substring(0, 1000)}`;

  try {
    const result = await callGroq(prompt, null, {
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 50,
    });
    const cleaned = result.trim().toLowerCase().replace(/[^a-z_]/g, "");
    return categories.includes(cleaned) ? cleaned : "outros";
  } catch (error) {
    console.warn("[ai-proxy] Groq falhou, tentando Cohere:", (error as Error).message);
    return await callCohere(prompt);
  }
}

async function handleAnalyze(body: RequestBody): Promise<string> {
  const systemPrompt = `Você é assistente jurídico brasileiro.
Forneça análises objetivas com fundamentação legal.`;

  const analysisType = body.analysis_type || "resumo";
  const prompt = `Analise tipo "${analysisType}":\n${JSON.stringify(body.process_data)}`;

  try {
    return await callNVIDIA(prompt, systemPrompt);
  } catch (error) {
    console.warn("[ai-proxy] NVIDIA falhou, tentando DeepSeek:", (error as Error).message);
    return await callOpenRouter(prompt, systemPrompt, {
      model: "deepseek/deepseek-r1",
    });
  }
}

// ============================================
// Main serve handler
// ============================================

serve(async (req) => {
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
    const body: RequestBody = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'action' field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result: unknown;

    switch (action) {
      case "generate":
        result = await handleGenerate(body);
        break;
      case "invoke_llm":
        result = await handleInvokeLLM(body);
        break;
      case "ocr":
        result = await handleOCR(body);
        break;
      case "classify":
        result = await handleClassify(body);
        break;
      case "analyze":
        result = await handleAnalyze(body);
        break;
      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown action: ${action}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ai-proxy] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
