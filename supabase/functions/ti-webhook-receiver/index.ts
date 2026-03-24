import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

/**
 * Normaliza o número do processo removendo qualquer caracter não numérico.
 */
function normalize(num: string): string {
  return num.replace(/\D/g, "");
}

/**
 * Gera o hash HMAC-SHA256 em formato Hexadecimal.
 */
async function getHMACSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  // 1. Verificação de Método
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signatureHeader = req.headers.get("X-Webhook-Signature");
  const secret = Deno.env.get("TI_WEBHOOK_SECRET") || "";

  // 2. Extração Crítica do Texto Bruto (Raw Body)
  const rawBody = await req.text();

  // 3. Blindagem Criptográfica (Matemática Estrita HMAC-SHA256)
  const hashCalculadoHex = await getHMACSignature(rawBody, secret);
  const expectedSig = 'sha256=' + hashCalculadoHex;

  if (signatureHeader !== expectedSig) {
    console.error(`[Webhook TI] Assinatura inválida. Recebida: ${signatureHeader}`);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = JSON.parse(rawBody);
    const { event_type, payload } = body;

    // 4. Processamento do Evento
    if (event_type !== "publications.created") {
      return new Response(JSON.stringify({ message: "Evento ignorado" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const processNumber = payload.numero_processo || payload.process_number;
    const content = payload.conteudo || payload.content;
    const date = payload.data_disponibilizacao || payload.date || new Date().toISOString().split("T")[0];

    if (!processNumber) {
      return new Response(JSON.stringify({ error: "Número do processo ausente" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedNum = normalize(processNumber);

    // 4. Inicializa Supabase com Service Role (Ignora RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 5. Casamento de Processo (Normalizado)
    // Buscamos no banco removendo caracteres não numéricos do process_number armazenado
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
        headers: { "Content-Type": "application/json" },
      });
    }

    // 6. Inserção de Movimentação (public.process_moves)
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
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Webhook TI] Erro interno:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
