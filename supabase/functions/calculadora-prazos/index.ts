import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  calcularPrazo,
  type InputPrazo,
} from "./core.ts";

// =============================================================================
// calculadora-prazos — Handler HTTP da Edge Function Serverless
// =============================================================================
//
// Toda a lógica matemática reside em ./core.ts (sem deps Deno).
// Este arquivo apenas expõe o endpoint HTTP com autenticação e validação.
//
// Endpoint: POST /functions/v1/calculadora-prazos
// Body: { data_publicacao: "YYYY-MM-DD", dias_prazo: number, dias_uteis?: boolean }
// Resposta: { due_date, d1_prazo, total_dias_corridos, feriados_pulados, recesso_aplicado, pascoa_do_ano }
//
// Segurança:
//   - verify_jwt=false (configurado no Supabase) + verificação manual via authenticateRequest
//   - Aceita: service_role (pg_net/classify-publication) ou staff autenticado
//   - Todos os cálculos são server-side — NUNCA exportar para o client React
//   - Timezone: UTC-3 (Brasília) garantido em core.ts via offset explícito
// =============================================================================

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = { ...getCorsHeaders(origin), "Content-Type": "application/json" };

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erro: "Método não permitido. Use POST." }), { status: 405, headers });
  }

  // ── Autenticação: aceita service_role (chamadas internas) ou staff autenticado ──
  const authPayload = await authenticateRequest(req);
  const isServiceRole = authPayload?.role === "service_role";
  const isStaff =
    authPayload &&
    authPayload.role === "authenticated" &&
    ["admin", "advogado", "secretaria", "assistente"].includes(
      (authPayload.app_metadata?.user_role as string) ?? ""
    );

  if (!isServiceRole && !isStaff) {
    console.warn("[calculadora-prazos] Acesso não autorizado. Role:", authPayload?.role ?? "nenhum");
    return new Response(
      JSON.stringify({ erro: "Acesso restrito. Autenticação obrigatória." }),
      { status: 403, headers }
    );
  }

  try {
    const body = await req.json() as InputPrazo;

    // Validação dos parâmetros de entrada
    if (!body.data_publicacao || typeof body.data_publicacao !== "string") {
      return new Response(
        JSON.stringify({ erro: "Campo obrigatório: data_publicacao (formato YYYY-MM-DD)" }),
        { status: 400, headers }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.data_publicacao)) {
      return new Response(
        JSON.stringify({ erro: "Formato inválido: data_publicacao deve ser YYYY-MM-DD" }),
        { status: 400, headers }
      );
    }

    if (
      !body.dias_prazo ||
      typeof body.dias_prazo !== "number" ||
      body.dias_prazo <= 0 ||
      !Number.isInteger(body.dias_prazo)
    ) {
      return new Response(
        JSON.stringify({ erro: "Campo obrigatório: dias_prazo (inteiro positivo)" }),
        { status: 400, headers }
      );
    }

    if (body.dias_prazo > 365 * 3) {
      return new Response(
        JSON.stringify({ erro: "dias_prazo não pode exceder 1095 dias (3 anos)" }),
        { status: 400, headers }
      );
    }

    const resultado = calcularPrazo({
      data_publicacao: body.data_publicacao,
      dias_prazo: body.dias_prazo,
      dias_uteis: body.dias_uteis !== false, // Default: true (CPC/2015)
    });

    console.log(
      `[calculadora-prazos] ✅ Publicação: ${body.data_publicacao} | ` +
      `Prazo: ${body.dias_prazo}du | D1: ${resultado.d1_prazo} | ` +
      `Vencimento: ${resultado.due_date} | Recesso: ${resultado.recesso_aplicado}`
    );

    return new Response(JSON.stringify(resultado), { status: 200, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[calculadora-prazos] Erro no cálculo:", msg);
    return new Response(
      JSON.stringify({ erro: `Erro no cálculo: ${msg}` }),
      { status: 500, headers }
    );
  }
});
