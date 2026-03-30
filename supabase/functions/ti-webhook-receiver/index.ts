import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Normaliza o número do processo removendo qualquer caracter não numérico.
 */
function normalize(num: string): string {
  return num.replace(/\D/g, "");
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

// In-memory rate limiting (simplificado para instâncias isoladas no Deno Edge)
const rateLimits = new Map<string, { count: number; expiresAt: number }>();

serve(async (req: Request) => {
  // Configuração de Headers de Segurança consolidada no _shared
  const securityHeaders = {
    ...getCorsHeaders(req.headers.get("origin")),
    "Content-Type": "application/json"
  };

  // 1. Rate Limiter (Max 100 requests per IP per minute)
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const limit = rateLimits.get(clientIp);

  if (limit && now < limit.expiresAt) {
    if (limit.count >= 100) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: securityHeaders,
      });
    }
    limit.count++;
  } else {
    rateLimits.set(clientIp, { count: 1, expiresAt: now + 60000 });
  }

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
      return new Response(JSON.stringify({ message: "Evento ignorado" }), {
        status: 200,
        headers: securityHeaders,
      });
    }

    const processNumber = payload.numero_processo || payload.process_number;
    const content = payload.conteudo || payload.content;
    const date = payload.data_disponibilizacao || payload.date || new Date().toISOString().split("T")[0];

    if (!processNumber) {
      return new Response(JSON.stringify({ error: "Número do processo ausente" }), {
        status: 400,
        headers: securityHeaders,
      });
    }

    const normalizedNum = normalize(processNumber);

    // 7. Inicializa Supabase com Service Role (Ignora RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 8. Casamento de Processo
    const { data: processes, error: searchError } = await supabase
      .from("processes")
      .select("id, process_number")
      .filter("process_number", "neq", null);

    if (searchError) throw searchError;

    const matchedProcess = processes.find(
      (p) => normalize(p.process_number) === normalizedNum
    );

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
