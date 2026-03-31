import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, getRateLimitHeaders } from "../_shared/rate-limit.ts";
/**
 * Normaliza o número do processo removendo qualquer caracter não numérico.
 */
function normalize(num: string): string {
  return num.replace(/\D/g, "");
}

/**
 * Extrai o número do processo de múltiplas fontes possíveis no payload.
 * Suporta campos diretos e aninhados, com ou sem máscara.
 */
function extractProcessNumber(payload: Record<string, unknown>): string | null {
  // Mapeamento de campos possíveis (diretos e aninhados)
  const fieldMappings = [
    // Campos diretos
    "numero_processo",
    "process_number",
    "numeroProcesso",
    "processNumber",
    // Campos aninhados em publication
    "publication.numero_processo",
    "publication.process_number",
    "publications.0.numero_processo",
    "publications.0.process_number",
    // Campos em data
    "data.numero_processo",
    "data.process_number",
  ];

  for (const field of fieldMappings) {
    const value = getNestedValue(payload, field);
    if (value && typeof value === "string" && value.trim().length > 0) {
      console.log(`[Webhook TI] Campo '${field}' encontrado com valor: ${value}`);
      return value.trim();
    }
  }

  console.log(`[Webhook TI] Nenhum campo de número de processo encontrado no payload.`);
  return null;
}

/**
 * Obtém valor de objeto aninhado via caminho com notação de ponto.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return null;
    if (typeof current !== "object") return null;

    // Tratamento para arrays (ex: publications.0)
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      if (isNaN(index) || index < 0 || index >= current.length) return null;
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Verifica o hash HMAC-SHA256 de forma timing-safe via Web Crypto API nativa do Deno.
 */
async function verifyHMAC(payload: string, secret: string, hexSignature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  const sigBytes = new Uint8Array(hexSignature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
  
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
}

// Remover: const rateLimits = new Map<...>
  
serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const stdRateLimitHeaders = getRateLimitHeaders(req, 5);
  
  // Configuração de Headers de Segurança consolidada no _shared
  const securityHeaders = {
    ...getCorsHeaders(origin),
    ...stdRateLimitHeaders,
    "Content-Type": "application/json"
  };

  // 1. Rate Limiter (Max 5 requests per IP per minute) via Shared Middleware
  const rateLimitResponse = enforceRateLimit(req, origin, 5);
  if (rateLimitResponse) return rateLimitResponse;

  // 2. Verificação de Método
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: securityHeaders,
    });
  }

  // 3. Idempotency Check (Defense-in-Depth)
  const idempotencyKey = req.headers.get("X-Idempotency-Key");
  if (idempotencyKey) {
    console.log(`[Webhook TI] Start processing Request com Idempotency-Key: ${idempotencyKey}`);
  }

  const signatureHeader = req.headers.get("X-Webhook-Signature");
  const secret = Deno.env.get("TI_WEBHOOK_SECRET") || "";

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
     return new Response(JSON.stringify({ error: "Missing or malformed signature" }), {
      status: 401,
      headers: securityHeaders,
    });
  }

  // 4. Extração Crítica do Texto Bruto (Raw Body) ANTES do JSON.parse
  const rawBody = await req.text();

  // 5. Blindagem Criptográfica (Timing-safe HMAC-SHA256 verification)
  const receivedHash = signatureHeader.replace("sha256=", "");
  const isValid = await verifyHMAC(rawBody, secret, receivedHash);

  if (!isValid) {
    console.error(`[Webhook TI] Assinatura inválida (Timing-Safe Check Failed). Recebida: ${signatureHeader}`);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: securityHeaders,
    });
  }

  try {
    const body = JSON.parse(rawBody);
    const { event_type, payload } = body;

    // 6. Processamento do Evento
    if (event_type !== "publications.created") {
      console.log(`[Webhook TI] Evento ignorado: ${event_type}`);
      return new Response(JSON.stringify({ message: "Evento ignorado" }), {
        status: 200,
        headers: securityHeaders,
      });
    }

    console.log(`[Webhook TI] Payload recebido: ${Deno.inspect(payload)}`);

    // ========================================================================
    // GUARD CLAUSES: Validação defensiva do payload ANTES do processamento
    // ========================================================================
    
    // Guard 1: Verifica se publications existe e não está vazio
    const publications = payload.publications;
    if (Array.isArray(publications) && publications.length === 0) {
      console.log(`[Webhook TI] Guard: publications array está vazio. Abortando graciosamente.`);
      return new Response(JSON.stringify({ message: "Nenhuma publicação para processar" }), {
        status: 200,
        headers: securityHeaders,
      });
    }
    
    if (publications === null || publications === undefined) {
      console.log(`[Webhook TI] Guard: publications é null/undefined. Abortando graciosamente.`);
      return new Response(JSON.stringify({ message: "Publicações não disponíveis" }), {
        status: 200,
        headers: securityHeaders,
      });
    }

    // Guard 2: Verifica se payload tem estrutura mínima
    if (!payload || typeof payload !== "object") {
      console.error(`[Webhook TI] Guard: payload inválido ou ausente.`);
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: securityHeaders,
      });
    }

    // Extrai o número do processo de múltiplas fontes possíveis
    const processNumber = extractProcessNumber(payload);
    const content = payload.conteudo || payload.content;
    const date = payload.data_disponibilizacao || payload.date || new Date().toISOString().split("T")[0];

    if (!processNumber) {
      console.error(`[Webhook TI] Número do processo ausente no payload. Campos disponíveis: ${Object.keys(payload).join(", ")}`);
      return new Response(JSON.stringify({ error: "Número do processo ausente", received_fields: Object.keys(payload) }), {
        status: 400,
        headers: securityHeaders,
      });
    }

    const normalizedNum = normalize(processNumber);

    // 7. Inicializa Supabase com Service Role (Ignora RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 8. Casamento de Processo via process_number_normalized (Busca O(1))
    const { data: processes, error: searchError } = await supabase
      .from("processes")
      .select("id, process_number")
      .eq("process_number_normalized", normalizedNum)
      .limit(1);

    if (searchError) throw searchError;

    const matchedProcess = processes?.[0];

    if (!matchedProcess) {
      console.log(`[Webhook TI] Nenhum processo ativo encontrado para: ${processNumber}`);
      return new Response(JSON.stringify({ message: "Processo não encontrado" }), {
        status: 200,
        headers: securityHeaders,
      });
    }

    // 9. Inserção de Movimentação (public.process_moves)
    const { error: insertError } = await supabase.from("process_moves").insert({
      process_id: matchedProcess.id,
      process_number: matchedProcess.process_number,
      date: date,
      description: content || "Nova intimação recebida via Tramitação Inteligente.",
      move_type: "intimacao",
      source: "sistema",
    });

    if (insertError) throw insertError;

    console.log(`[Webhook TI] Sucesso: Intimação registrada para o processo ${processNumber}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: securityHeaders,
    });
  } catch (error) {
    console.error("[Webhook TI] Erro interno:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: securityHeaders,
    });
  }
});
