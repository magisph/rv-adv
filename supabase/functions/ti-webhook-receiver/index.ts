import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, getRateLimitHeaders } from "../_shared/rate-limit.ts";

// ============================================================================
// Autenticação Multi-Modal para Webhooks do TI (Tramitação Inteligente)
//
// O TI (Faraday v1.x) envia requisições sem JWT e sem HMAC. Suportamos:
//   1. HMAC-SHA256 via X-Webhook-Signature (preferencial, mais seguro)
//   2. Bearer token via Authorization header
//   3. Token via query param ?token=... (configurado na URL do webhook no TI)
//
// verify_jwt=false é obrigatório nesta função (deploy via MCP/CLI).
// ============================================================================

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
  const fieldMappings = [
    "numero_processo",
    "process_number",
    "numeroProcesso",
    "processNumber",
    "publication.numero_processo",
    "publication.process_number",
    "publications.0.numero_processo",
    "publications.0.process_number",
    "data.numero_processo",
    "data.process_number",
  ];

  for (const field of fieldMappings) {
    const value = getNestedValue(payload, field);
    if (value && typeof value === "string" && value.trim().length > 0) {
      console.log(`[Webhook TI] Campo '${field}' encontrado: ${value}`);
      return value.trim();
    }
  }

  console.log(`[Webhook TI] Nenhum campo de número de processo encontrado.`);
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
 * Compara duas strings de forma timing-safe para evitar timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Percorre igualmente para não vazar timing info sobre o comprimento
    let diff = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifica o hash HMAC-SHA256 de forma timing-safe via Web Crypto API.
 */
async function verifyHMAC(
  payload: string,
  secret: string,
  hexSignature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = new Uint8Array(
      hexSignature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
  } catch {
    return false;
  }
}

/**
 * Autentica a requisição do TI usando múltiplas estratégias.
 *
 * Fluxo:
 *   1. HMAC-SHA256 via X-Webhook-Signature (mais seguro)
 *   2. Bearer token via Authorization header
 *   3. Token via query param ?token=...
 *
 * Retorna true se autenticado, false caso contrário.
 */
async function authenticateWebhook(
  req: Request,
  rawBody: string,
  secret: string
): Promise<{ ok: boolean; method: string }> {
  if (!secret) {
    console.error("[Webhook TI] FATAL: TI_WEBHOOK_SECRET não configurado!");
    return { ok: false, method: "no-secret" };
  }

  // --- Estratégia 1: HMAC-SHA256 ---
  const signatureHeader = req.headers.get("X-Webhook-Signature");
  if (signatureHeader?.startsWith("sha256=")) {
    const hexSig = signatureHeader.replace("sha256=", "");
    const valid = await verifyHMAC(rawBody, secret, hexSig);
    if (valid) {
      return { ok: true, method: "hmac-sha256" };
    }
    console.warn("[Webhook TI] X-Webhook-Signature presente mas inválida.");
    return { ok: false, method: "hmac-sha256-invalid" };
  }

  // --- Estratégia 2: Bearer token ---
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (timingSafeEqual(token, secret)) {
      return { ok: true, method: "bearer-token" };
    }
    console.warn("[Webhook TI] Authorization Bearer presente mas inválido.");
    return { ok: false, method: "bearer-invalid" };
  }

  // --- Estratégia 3: Query param ?token=... ---
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken) {
    if (timingSafeEqual(queryToken, secret)) {
      return { ok: true, method: "query-token" };
    }
    console.warn("[Webhook TI] Query param ?token presente mas inválido.");
    return { ok: false, method: "query-token-invalid" };
  }

  console.warn(
    "[Webhook TI] Nenhum mecanismo de autenticação detectado na requisição."
  );
  return { ok: false, method: "no-auth-header" };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const stdRateLimitHeaders = getRateLimitHeaders(req, 30);

  const securityHeaders = {
    ...getCorsHeaders(origin),
    ...stdRateLimitHeaders,
    "Content-Type": "application/json",
  };

  // 1. Rate Limiter (Max 30 req/min — webhooks podem chegar em rajadas)
  const rateLimitResponse = enforceRateLimit(req, origin, 30);
  if (rateLimitResponse) return rateLimitResponse;

  // 2. Verificação de Método
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: securityHeaders,
    });
  }

  // 3. Idempotency Key (log apenas)
  const idempotencyKey = req.headers.get("X-Idempotency-Key");
  if (idempotencyKey) {
    console.log(`[Webhook TI] Idempotency-Key: ${idempotencyKey}`);
  }

  // 4. Leitura do Raw Body (ANTES de qualquer parse)
  const rawBody = await req.text();

  // 5. Autenticação Multi-Modal
  const secret = Deno.env.get("TI_WEBHOOK_SECRET") || "";
  const auth = await authenticateWebhook(req, rawBody, secret);

  if (!auth.ok) {
    console.error(
      `[Webhook TI] Autenticação falhou. Método tentado: ${auth.method}`
    );
    console.error(
      `[Webhook TI] Headers recebidos: ${JSON.stringify([...req.headers.entries()])}`
    );
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        hint:
          "Configure a URL do webhook no TI com ?token=<TI_WEBHOOK_SECRET>",
      }),
      { status: 401, headers: securityHeaders }
    );
  }

  console.log(`[Webhook TI] Autenticado via: ${auth.method}`);

  try {
    const body = JSON.parse(rawBody);
    const { event_type, payload } = body;

    // 6. Health check / teste de conectividade
    if (event_type === "test_event") {
      console.log(`[Webhook TI] test_event — Health Check OK`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Webhook ativo e autenticado",
          auth_method: auth.method,
        }),
        { status: 200, headers: securityHeaders }
      );
    }

    // 7. Eventos não processados
    if (event_type !== "publications.created") {
      console.log(`[Webhook TI] Evento ignorado: '${event_type}'`);
      return new Response(
        JSON.stringify({ message: "Evento ignorado", event_type }),
        { status: 200, headers: securityHeaders }
      );
    }

    console.log(`[Webhook TI] Processando publications.created...`);

    // 8. Guard Clauses — Validação defensiva do payload
    if (!payload || typeof payload !== "object") {
      console.error(`[Webhook TI] Guard: payload inválido.`);
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: securityHeaders,
      });
    }

    const publications = (payload as Record<string, unknown>).publications;
    if (Array.isArray(publications) && publications.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma publicação para processar" }),
        { status: 200, headers: securityHeaders }
      );
    }

    if (publications === null || publications === undefined) {
      return new Response(
        JSON.stringify({ message: "Publicações não disponíveis" }),
        { status: 200, headers: securityHeaders }
      );
    }

    // 9. Extração de campos
    const typedPayload = payload as Record<string, unknown>;
    const processNumber = extractProcessNumber(typedPayload);
    const content = typedPayload.conteudo || typedPayload.content;
    const date =
      typedPayload.data_disponibilizacao ||
      typedPayload.date ||
      new Date().toISOString().split("T")[0];

    if (!processNumber) {
      console.error(
        `[Webhook TI] Número do processo ausente. Campos: ${Object.keys(typedPayload).join(", ")}`
      );
      return new Response(
        JSON.stringify({
          error: "Número do processo ausente",
          received_fields: Object.keys(typedPayload),
        }),
        { status: 400, headers: securityHeaders }
      );
    }

    const normalizedNum = normalize(processNumber);

    // 10. Supabase — Service Role (bypassa RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 11. Casamento pelo número normalizado
    const { data: processes, error: searchError } = await supabase
      .from("processes")
      .select("id, process_number")
      .eq("process_number_normalized", normalizedNum)
      .limit(1);

    if (searchError) throw searchError;

    const matchedProcess = processes?.[0];

    if (!matchedProcess) {
      console.log(
        `[Webhook TI] Processo não encontrado: ${processNumber}`
      );
      return new Response(
        JSON.stringify({ message: "Processo não encontrado" }),
        { status: 200, headers: securityHeaders }
      );
    }

    // 12. Inserção da movimentação
    const { error: insertError } = await supabase.from("process_moves").insert({
      process_id: matchedProcess.id,
      process_number: matchedProcess.process_number,
      date: date,
      description:
        content || "Nova intimação recebida via Tramitação Inteligente.",
      move_type: "intimacao",
      source: "sistema",
    });

    if (insertError) throw insertError;

    console.log(
      `[Webhook TI] Sucesso: intimação registrada para ${processNumber}`
    );

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
