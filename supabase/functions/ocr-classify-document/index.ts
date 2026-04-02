// Supabase Edge Function: ocr-classify-document
// Receives a storage_path, downloads the file from bucket 'periciapro-documentos',
// sends it to Gemini Vision for OCR + classification, and updates the database record.
// Deploy: npx supabase functions deploy ocr-classify-document

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
const AI_TIMEOUT_MS = 60_000; // 60 segundos (vision é mais lento)

function createTimeoutSignal(ms: number = AI_TIMEOUT_MS): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) };
}

// ============================================
// UUID validation
// ============================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

const CATEGORIES = [
  "pessoais", "inss", "medicos", "judicial",
  "peticao", "prova", "laudo", "contrato",
  "procuracao", "outros",
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 🔒 JWT Authentication Gate
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { storage_path, pericia_id, documento_id, categoria } = await req.json();

    if (!storage_path || !documento_id) {
      return new Response(
        JSON.stringify({ success: false, error: "storage_path and documento_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID structure for pericia_id
    if (pericia_id && !isValidUUID(pericia_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid pericia_id format (expected UUID)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("periciapro-documentos")
      .download(storage_path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ success: false, error: `Download failed: ${downloadError?.message || "no data"}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Determine if file is image (for Vision) or text-based
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(storage_path);
    const isPDF = /\.pdf$/i.test(storage_path);

    let extractedText = "";
    let classifiedCategory = categoria || "outros";

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      // Fallback: use pre-supplied category, skip OCR
      console.warn("[OCR] GEMINI_API_KEY not set, skipping OCR. Using provided categoria.");
      await supabase
        .from("pericia_documentos")
        .update({
          classificacao_ia: {
            status: "skipped",
            reason: "GEMINI_API_KEY not configured",
            categoria: classifiedCategory,
            processed_at: new Date().toISOString(),
          },
        })
        .eq("id", documento_id);

      return new Response(
        JSON.stringify({ success: true, status: "skipped", categoria: classifiedCategory }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isImage) {
      // 3a. Image → Gemini Vision OCR + Classification
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const mimeType = fileData.type || "image/jpeg";

      let rawText = "";
      let usedModel = "gemini-2.0-flash";
      const promptText = `Analise este documento jurídico brasileiro. Execute duas tarefas:
1. EXTRAIA todo o texto visível do documento, mantendo a formatação (parágrafos, tabelas, campos).
2. CLASSIFIQUE o documento em UMA das categorias: ${CATEGORIES.join(", ")}.

Responda EXCLUSIVAMENTE em JSON válido:
{
  "extracted_text": "texto completo extraído...",
  "categoria": "nome_da_categoria",
  "confidence": 0.95,
  "campos_identificados": { "nome": "...", "cpf": "...", "data": "..." }
}`;

      try {
        // 🔒 Gemini API key no header, NÃO na URL
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

        const { signal, clear } = createTimeoutSignal();
        try {
          const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiApiKey,
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: promptText },
                  { inline_data: { mime_type: mimeType, data: base64 } },
                ],
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
            }),
            signal,
          });

          if (!geminiResponse.ok) {
            const errText = await geminiResponse.text().catch(() => geminiResponse.statusText);
            throw new Error(`Gemini Vision ${geminiResponse.status}: ${errText}`);
          }

          const geminiData = await geminiResponse.json();
          rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } finally {
          clear();
        }
      } catch (geminiError) {
        console.warn("[OCR] Gemini SDK request failed. Triggering Copilot fallback (OpenRouter)...", geminiError);
        usedModel = "google/gemini-2.5-flash (OpenRouter Fallback)";
        
        const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
        if (!openRouterKey) {
          throw new Error(`Gemini failed and OPENROUTER_API_KEY is not configured. Original error: ${geminiError instanceof Error ? geminiError.message : "Unknown"}`);
        }

        const { signal, clear } = createTimeoutSignal();
        try {
          const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: promptText },
                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
                  ]
                }
              ],
              response_format: { type: "json_object" }
            }),
            signal,
          });

          if (!openRouterResponse.ok) {
            const errText = await openRouterResponse.text().catch(() => openRouterResponse.statusText);
            throw new Error(`OpenRouter Fallback ${openRouterResponse.status}: ${errText}`);
          }

          const openRouterData = await openRouterResponse.json();
          rawText = openRouterData.choices?.[0]?.message?.content || "";
        } finally {
          clear();
        }
      }

      // Parse JSON from Gemini or OpenRouter response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          extractedText = parsed.extracted_text || rawText;
          classifiedCategory = CATEGORIES.includes(parsed.categoria) ? parsed.categoria : "outros";

          // 4. Update database with OCR results
          await supabase
            .from("pericia_documentos")
            .update({
              classificacao_ia: {
                status: "completed",
                extracted_text: extractedText.substring(0, 10000), // Limit size
                categoria: classifiedCategory,
                confidence: parsed.confidence || null,
                campos_identificados: parsed.campos_identificados || {},
                processed_at: new Date().toISOString(),
                model: usedModel,
              },
              categoria: classifiedCategory,
            })
            .eq("id", documento_id);
        } catch (parseError) {
          // 🔒 JSON parsing failed — registra erro no banco em vez de falha silenciosa
          console.error("[OCR] JSON parse failed:", (parseError as Error).message);
          extractedText = rawText;

          await supabase
            .from("pericia_documentos")
            .update({
              classificacao_ia: {
                status: "parse_error",
                error: `JSON parse failed: ${(parseError as Error).message}`,
                raw_text_preview: rawText.substring(0, 500),
                categoria: classifiedCategory,
                processed_at: new Date().toISOString(),
                model: usedModel,
              },
            })
            .eq("id", documento_id);
        }
      } else {
        // No JSON found in response — store raw and mark as parse error
        extractedText = rawText;
        await supabase
          .from("pericia_documentos")
          .update({
            classificacao_ia: {
              status: "parse_error",
              error: "No JSON object found in AI response",
              raw_text_preview: rawText.substring(0, 500),
              categoria: classifiedCategory,
              processed_at: new Date().toISOString(),
              model: usedModel,
            },
          })
          .eq("id", documento_id);
      }
    } else if (isPDF) {
      // 3b. PDF → extract text and classify via Groq (text model)
      // PDFs in Supabase Storage are binary; for now, mark as pending manual review
      await supabase
        .from("pericia_documentos")
        .update({
          classificacao_ia: {
            status: "pending_review",
            reason: "PDF requires manual review or server-side extraction",
            categoria: classifiedCategory,
            processed_at: new Date().toISOString(),
          },
        })
        .eq("id", documento_id);

      return new Response(
        JSON.stringify({ success: true, status: "pending_review", categoria: classifiedCategory }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // 3c. Other file types — use provided category
      await supabase
        .from("pericia_documentos")
        .update({
          classificacao_ia: {
            status: "unsupported_format",
            categoria: classifiedCategory,
            processed_at: new Date().toISOString(),
          },
        })
        .eq("id", documento_id);

      return new Response(
        JSON.stringify({ success: true, status: "unsupported_format", categoria: classifiedCategory }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log activity
    if (pericia_id) {
      await supabase.from("activity_logs").insert({
        pericia_id,
        type: "document",
        description: `Documento classificado por IA como "${classifiedCategory}"`,
        metadata: { documento_id, categoria: classifiedCategory },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        categoria: classifiedCategory,
        text_length: extractedText.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OCR] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
