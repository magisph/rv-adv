import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, getRateLimitHeaders } from "../_shared/rate-limit.ts";
import { processarTeorIntimacao } from "../_shared/textProcessing.ts";

// ============================================================================
// ti-webhook-receiver — Fast-lane receptor de intimações DJEN (Advisian v2)
//
// Arquitetura de desacoplamento assíncrono:
//   ANTES: Recepção → Embedding → RAG → LLM → INSERT → 200 OK  (~15s)
//   AGORA: Recepção → SHA-256 → INSERT → 200 OK                 (<800ms)
//                                    ↓ (trigger pg_net)
//                           classify-publication (background)
//
// verify_jwt=false obrigatório (TI não envia JWT Supabase).
// ============================================================================

function normalize(num: string): string {
  return num.replace(/\D/g, "");
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return null;
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

function extractProcessNumber(payload: Record<string, unknown>): string | null {
  const fields = [
    "numero_processo", "process_number", "numeroProcesso", "processNumber",
    "publication.numero_processo", "publication.process_number",
    "publications.0.numero_processo", "publications.0.process_number",
    "data.numero_processo", "data.process_number",
  ];
  for (const field of fields) {
    const value = getNestedValue(payload, field);
    if (value && typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length !== b.length ? 1 : 0;
  for (let i = 0; i < maxLen; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function verifyHMAC(payload: string, secret: string, hexSig: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = new Uint8Array(hexSig.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []);
    return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  } catch { return false; }
}

async function authenticate(req: Request, rawBody: string, secret: string): Promise<{ ok: boolean; method: string }> {
  if (!secret) return { ok: false, method: "no-secret" };

  const sig = req.headers.get("X-Webhook-Signature");
  if (sig?.startsWith("sha256=")) {
    const valid = await verifyHMAC(rawBody, secret, sig.replace("sha256=", ""));
    return { ok: valid, method: valid ? "hmac-sha256" : "hmac-sha256-invalid" };
  }

  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (bearer) return { ok: timingSafeEqual(bearer, secret), method: "bearer-token" };

  const qtoken = new URL(req.url).searchParams.get("token");
  if (qtoken) return { ok: timingSafeEqual(qtoken, secret), method: "query-token" };

  return { ok: false, method: "no-auth-header" };
}

// ============================================================================
// Handler Principal — Fast-lane (<800ms)
// ============================================================================
serve(async (req: Request) => {
  const t0 = Date.now();
  const origin = req.headers.get("origin");
  const headers = { ...getCorsHeaders(origin), ...getRateLimitHeaders(req, 30), "Content-Type": "application/json" };

  const rateLimited = enforceRateLimit(req, origin, 30);
  if (rateLimited) return rateLimited;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers });
  }

  const rawBody = await req.text();
  const secret = Deno.env.get("TI_WEBHOOK_SECRET") || "";
  const auth = await authenticate(req, rawBody, secret);

  if (!auth.ok) {
    console.error(`[Webhook TI] Autenticação falhou: ${auth.method}`);
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }

  try {
    const { event_type, payload } = JSON.parse(rawBody);

    if (event_type === "test_event") {
      return new Response(JSON.stringify({ success: true, message: "Webhook ativo", auth_method: auth.method }), { status: 200, headers });
    }

    if (event_type !== "publications.created") {
      return new Response(JSON.stringify({ message: "Evento ignorado", event_type }), { status: 200, headers });
    }

    if (!payload || typeof payload !== "object") {
      return new Response(JSON.stringify({ error: "Payload inválido" }), { status: 400, headers });
    }

    const typedPayload = payload as Record<string, unknown>;
    const publications = typedPayload.publications;

    if (!publications || (Array.isArray(publications) && publications.length === 0)) {
      return new Response(JSON.stringify({ message: "Sem publicações" }), { status: 200, headers });
    }

    const processNumber = extractProcessNumber(typedPayload);
    if (!processNumber) {
      return new Response(
        JSON.stringify({ error: "Número do processo ausente", received_fields: Object.keys(typedPayload) }),
        { status: 400, headers }
      );
    }

    const content = (typedPayload.conteudo || typedPayload.content || "") as string;
    const date = (typedPayload.data_disponibilizacao || typedPayload.date || new Date().toISOString().split("T")[0]) as string;
    const normalizedNum = normalize(processNumber);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Casamento pelo número normalizado
    const { data: processes, error: searchError } = await supabase
      .from("processes")
      .select("id, process_number")
      .eq("process_number_normalized", normalizedNum)
      .limit(1);

    if (searchError) throw searchError;

    const matched = processes?.[0];
    if (!matched) {
      return new Response(JSON.stringify({ message: "Processo não encontrado" }), { status: 200, headers });
    }

    // =========================================================================
    // FAST-LANE: Barreira SHA-256 de Deduplicação Canônica
    // Extrai teor puro + gera hash — sem LLM, sem embedding, sem RAG.
    // =========================================================================
    const { teorPuro, hash: teor_sha256 } = await processarTeorIntimacao(content);
    console.log(`[Webhook TI] Teor: ${teorPuro.length}c | Hash: ${teor_sha256?.substring(0, 16) ?? "null"}...`);

    // Verificação de duplicata ANTES do INSERT (fail-fast)
    if (teor_sha256) {
      const { data: existing } = await supabase
        .from("process_moves")
        .select("id")
        .eq("teor_sha256", teor_sha256)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log(`[Webhook TI] ⚡ DUPLICATA (${Date.now() - t0}ms) hash=${teor_sha256.substring(0, 16)}`);
        return new Response(JSON.stringify({ success: true, duplicata: true }), { status: 200, headers });
      }
    }

    // INSERT atômico — trigger pg_net dispara classify-publication em background
    const { data: insertedMove, error: insertError } = await supabase
      .from("process_moves")
      .insert({
        process_id: matched.id,
        process_number: matched.process_number,
        date,
        description: content || "Intimação recebida via Tramitação Inteligente.",
        move_type: "intimacao",
        source: "sistema",
        teor_sha256: teor_sha256 ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      // 23505 = unique_violation (race condition entre webhooks simultâneos)
      if (insertError.code === "23505") {
        console.log(`[Webhook TI] ⚡ DUPLICATA via UNIQUE constraint (${Date.now() - t0}ms)`);
        return new Response(JSON.stringify({ success: true, duplicata: true }), { status: 200, headers });
      }
      throw insertError;
    }

    // Prazo inicial conservador — métricas IA preenchidas pelo classify-publication
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 15);

    await supabase.from("deadlines").insert({
      processo_id: matched.id,
      titulo: `Intimação - ${processNumber}`,
      descricao: content ? content.substring(0, 500) : "Intimação via Tramitação Inteligente",
      due_date: dueDate.toISOString(),
      status: "pendente",
      prioridade: "alta",
      revisao_humana_pendente: true, // HITL ativo até o worker classificar
      ia_modelo_usado: "aguardando-classify-publication",
    }).then(({ error }) => {
      if (error) console.error("[Webhook TI] Erro ao criar prazo:", error);
    });

    const elapsed = Date.now() - t0;
    console.log(`[Webhook TI] ✅ Fast-lane ${elapsed}ms | Move: ${insertedMove?.id} | classify-publication ativado`);

    return new Response(
      JSON.stringify({ success: true, process_move_id: insertedMove?.id, elapsed_ms: elapsed }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error("[Webhook TI] Erro interno:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), { status: 500, headers });
  }
});
