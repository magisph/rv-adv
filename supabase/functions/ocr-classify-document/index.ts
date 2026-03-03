// Supabase Edge Function: ocr-classify-document
// Receives a storage_path, downloads the file from bucket 'periciapro-documentos',
// sends it to Gemini Vision for OCR + classification, and updates the database record.
// Deploy: npx supabase functions deploy ocr-classify-document

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "pessoais", "inss", "medicos", "judicial",
  "peticao", "prova", "laudo", "contrato",
  "procuracao", "outros",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storage_path, pericia_id, documento_id, categoria } = await req.json();

    if (!storage_path || !documento_id) {
      return new Response(
        JSON.stringify({ success: false, error: "storage_path and documento_id are required" }),
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

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Analise este documento jurídico brasileiro. Execute duas tarefas:
1. EXTRAIA todo o texto visível do documento, mantendo a formatação (parágrafos, tabelas, campos).
2. CLASSIFIQUE o documento em UMA das categorias: ${CATEGORIES.join(", ")}.

Responda EXCLUSIVAMENTE em JSON válido:
{
  "extracted_text": "texto completo extraído...",
  "categoria": "nome_da_categoria",
  "confidence": 0.95,
  "campos_identificados": { "nome": "...", "cpf": "...", "data": "..." }
}`,
              },
              {
                inline_data: { mime_type: mimeType, data: base64 },
              },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text().catch(() => geminiResponse.statusText);
        throw new Error(`Gemini Vision ${geminiResponse.status}: ${errText}`);
      }

      const geminiData = await geminiResponse.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse JSON from Gemini response
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
                model: "gemini-2.0-flash",
              },
              categoria: classifiedCategory,
            })
            .eq("id", documento_id);
        } catch {
          // JSON parsing failed, store raw text
          extractedText = rawText;
        }
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
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
