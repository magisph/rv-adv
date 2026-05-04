// ============================================================================
// scrape-trf5 - Supabase Edge Function
// Coleta julgados TRF5/TRU-CE e persiste no fluxo canonico public.jurisprudences.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, getRateLimitHeaders } from "../_shared/rate-limit.ts";
import {
  formatDateToBr,
  normalizeTrf5Document,
  type NormalizedJurisprudence,
  type Trf5RawDocument,
} from "./normalizer.ts";
import { DEFAULT_PREVIDENCIARY_TERMS, TRF5_CE_ORGAOS_JULGADORES } from "./terms.ts";

const TRF5_ENDPOINT =
  "https://juliapesquisa.trf5.jus.br/julia-pesquisa/api/v1/documento:dt/TRU";
const SCRAPER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
const PAGE_SIZE = 10;
const PORTAL_DELAY_MS = 1_000;
const SIMILARITY_THRESHOLD = 0.85;
const MAX_TERMS = 20;
const MAX_PAGES_PER_TERM = 50;

const RequestSchema = z.object({
  mode: z.enum(["initial_import", "daily_sync", "manual_range"]).default("manual_range"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  terms: z.array(z.string().trim().min(2).max(120)).max(MAX_TERMS).optional(),
  maxPagesPerTerm: z.number().int().min(1).max(MAX_PAGES_PER_TERM).optional(),
  pesquisa_livre: z.string().trim().min(2).max(120).optional(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

type ScrapeRequest = z.infer<typeof RequestSchema>;

interface Trf5Response {
  recordsTotal?: number;
  recordsFiltered?: number;
  data?: Trf5RawDocument[];
  error?: string | null;
}

interface PersistResult {
  inserted_id: string | null;
  inserted: boolean;
  was_duplicate: boolean;
  similarity_score: number | null;
  is_unique_teor: boolean;
  duplicate_reason: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function subtractDaysIso(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function assertDateRange(startDate: string, endDate: string): void {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new Error("Intervalo de datas invalido.");
  }
}

function resolveTerms(body: ScrapeRequest): string[] {
  const rawTerms =
    body.terms && body.terms.length > 0
      ? body.terms
      : body.pesquisa_livre
        ? [body.pesquisa_livre]
        : [...DEFAULT_PREVIDENCIARY_TERMS];

  return [...new Set(rawTerms.map((term) => term.trim()).filter(Boolean))].slice(0, MAX_TERMS);
}

async function resolveDateRange(
  supabase: ReturnType<typeof createClient<any, "public", any>>,
  body: ScrapeRequest,
): Promise<{ startDate: string; endDate: string }> {
  if (body.mode === "initial_import") {
    return {
      startDate: body.startDate ?? body.data_inicio ?? "2026-01-01",
      endDate: body.endDate ?? body.data_fim ?? "2026-05-04",
    };
  }

  if (body.mode === "daily_sync") {
    const { data, error } = await supabase
      .from("jurisprudences")
      .select("trial_date")
      .eq("source", "trf5")
      .eq("jurisdicao", "CE")
      .not("trial_date", "is", null)
      .order("trial_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error("Falha ao consultar ultima data TRF5.");

    const lastTrialDate = typeof data?.trial_date === "string" ? data.trial_date : todayIso();
    return {
      startDate: body.startDate ?? subtractDaysIso(lastTrialDate, 5),
      endDate: body.endDate ?? todayIso(),
    };
  }

  return {
    startDate: body.startDate ?? body.data_inicio ?? "2026-01-01",
    endDate: body.endDate ?? body.data_fim ?? todayIso(),
  };
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "User-Agent": SCRAPER_UA,
          "X-Requested-With": "XMLHttpRequest",
          Referer: "https://juliapesquisa.trf5.jus.br/julia-pesquisa/pesquisa",
        },
      });

      if (response.ok || response.status < 500) return response;
      lastError = new Error(`TRF5 HTTP ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Falha de rede no TRF5.");
    }

    await sleep(2 ** attempt * 1_000);
  }

  throw lastError ?? new Error("Falha ao consultar TRF5.");
}

async function fetchTrf5Page(
  term: string,
  orgaoJulgador: string,
  startDate: string,
  endDate: string,
  offset: number,
): Promise<Trf5Response> {
  const url = new URL(TRF5_ENDPOINT);
  const params: Record<string, string> = {
    pesquisaLivre: term,
    numeroProcesso: "",
    orgaoJulgador,
    relator: "",
    dataIni: formatDateToBr(startDate),
    dataFim: formatDateToBr(endDate),
    draw: "1",
    start: String(offset),
    length: String(PAGE_SIZE),
    orgao: "TRU",
    secao: "CE",
  };

  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  await sleep(PORTAL_DELAY_MS);
  const response = await fetchWithRetry(url.toString());
  if (!response.ok) {
    throw new Error(`TRF5 retornou HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Trf5Response;
  if (payload.error) {
    throw new Error("Portal TRF5 retornou erro na consulta.");
  }

  return payload;
}

async function generateEmbedding(text: string, authHeader: string): Promise<number[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL nao configurada.");

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "embedding",
      text: text.slice(0, 25_000),
      taskType: "RETRIEVAL_DOCUMENT",
    }),
  });

  if (!response.ok) {
    throw new Error(`ai-proxy embedding HTTP ${response.status}`);
  }

  const data = await response.json();
  const embedding = data?.embedding ?? data?.data?.embedding ?? data?.data;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding invalido retornado pelo ai-proxy.");
  }

  return embedding;
}

async function persistJurisprudence(
  supabase: ReturnType<typeof createClient<any, "public", any>>,
  item: NormalizedJurisprudence,
  embedding: number[],
): Promise<PersistResult> {
  const { data, error } = await supabase.rpc("verificar_inserir_jurisprudencia", {
    p_process_number: item.process_number,
    p_process_number_raw: item.process_number_raw,
    p_trial_date: item.trial_date,
    p_publication_date: item.trial_date,
    p_relator: item.relator,
    p_orgao_julgador: item.orgao_julgador,
    p_excerpt: item.excerpt,
    p_full_text: item.full_text,
    p_tema: item.tema,
    p_source: item.source,
    p_jurisdicao: item.jurisdicao,
    p_source_url: item.source_url,
    p_external_id: item.external_id,
    p_embedding: embedding,
    p_similarity_threshold: SIMILARITY_THRESHOLD,
  });

  if (error) throw new Error(`Falha ao persistir jurisprudencia: ${error.message}`);

  const first = Array.isArray(data) ? data[0] : data;
  return {
    inserted_id: first?.inserted_id ?? null,
    inserted: Boolean(first?.inserted),
    was_duplicate: Boolean(first?.was_duplicate),
    similarity_score: typeof first?.similarity_score === "number" ? first.similarity_score : null,
    is_unique_teor: Boolean(first?.is_unique_teor),
    duplicate_reason: first?.duplicate_reason ?? null,
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const rateLimited = enforceRateLimit(req, origin, 10);
  if (rateLimited) return rateLimited;

  const auth = await authenticateRequest(req);
  if (!auth) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401, corsHeaders);
  }
  if (auth.role !== "service_role") {
    return jsonResponse({ success: false, error: "Forbidden" }, 403, corsHeaders);
  }

  let parsedBody: ScrapeRequest;
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { success: false, error: "Parametros invalidos", details: parsed.error.issues },
        400,
        corsHeaders,
      );
    }
    parsedBody = parsed.data;
  } catch {
    return jsonResponse({ success: false, error: "Body JSON invalido" }, 400, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Supabase env indisponivel" }, 503, corsHeaders);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const { startDate, endDate } = await resolveDateRange(supabase, parsedBody);
    assertDateRange(startDate, endDate);

    const terms = resolveTerms(parsedBody);
    const maxPagesPerTerm = parsedBody.maxPagesPerTerm ?? (parsedBody.mode === "daily_sync" ? 5 : 20);
    const authHeader = req.headers.get("authorization") ?? "";

    const seenKeys = new Set<string>();
    const previewItems: Array<Record<string, unknown>> = [];
    const metrics = {
      mode: parsedBody.mode,
      startDate,
      endDate,
      terms: terms.length,
      portalRequests: 0,
      found: 0,
      normalized: 0,
      inserted: 0,
      updated: 0,
      ignored: 0,
      duplicateExact: 0,
      duplicateSimilarity: 0,
      unique: 0,
      errors: 0,
      truncated: false,
    };

    for (const term of terms) {
      for (const orgaoJulgador of TRF5_CE_ORGAOS_JULGADORES) {
        let offset = 0;
        let page = 0;
        let total = Number.POSITIVE_INFINITY;

        while (offset < total && page < maxPagesPerTerm) {
          const payload = await fetchTrf5Page(term, orgaoJulgador, startDate, endDate, offset);
          metrics.portalRequests++;

          const rows = Array.isArray(payload.data) ? payload.data : [];
          total = typeof payload.recordsFiltered === "number"
            ? payload.recordsFiltered
            : typeof payload.recordsTotal === "number"
              ? payload.recordsTotal
              : rows.length;
          metrics.found += rows.length;

          if (rows.length === 0) break;

          for (const row of rows) {
            const normalized = normalizeTrf5Document(row);
            if (!normalized) {
              metrics.ignored++;
              continue;
            }

            const key = [
              normalized.process_number,
              normalized.trial_date ?? "",
              normalized.orgao_julgador ?? "",
            ].join("|");
            if (seenKeys.has(key)) {
              metrics.ignored++;
              continue;
            }
            seenKeys.add(key);
            metrics.normalized++;

            try {
              const embedding = await generateEmbedding(normalized.excerpt, authHeader);
              const persisted = await persistJurisprudence(supabase, normalized, embedding);

              if (persisted.inserted) metrics.inserted++;
              else metrics.updated++;

              if (persisted.was_duplicate) metrics.duplicateExact++;
              if (!persisted.is_unique_teor) metrics.duplicateSimilarity++;
              if (persisted.is_unique_teor) metrics.unique++;

              if (previewItems.length < 10) {
                previewItems.push({
                  id: persisted.inserted_id,
                  process_number: normalized.process_number,
                  trial_date: normalized.trial_date,
                  relator: normalized.relator,
                  orgao_julgador: normalized.orgao_julgador,
                  source: normalized.source,
                  jurisdicao: normalized.jurisdicao,
                  similarity_score: persisted.similarity_score,
                  is_unique_teor: persisted.is_unique_teor,
                });
              }
            } catch (error) {
              metrics.errors++;
              console.error("[scrape-trf5] item processing failed:", (error as Error).message);
            }
          }

          offset += PAGE_SIZE;
          page++;
        }

        if (offset < total) metrics.truncated = true;
      }
    }

    return jsonResponse(
      {
        success: true,
        metrics,
        items: previewItems,
      },
      200,
      { ...corsHeaders, ...getRateLimitHeaders(req, 10) },
    );
  } catch (error) {
    console.error("[scrape-trf5] pipeline failed:", (error as Error).message);
    return jsonResponse(
      { success: false, error: "Erro ao executar coleta TRF5" },
      500,
      corsHeaders,
    );
  }
});
