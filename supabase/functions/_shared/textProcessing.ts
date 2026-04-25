// =============================================================================
// _shared/textProcessing.ts — Utilitários de Processamento de Texto Jurídico
// =============================================================================
// Advisian Canonical Text Processing™
//
// Funções para:
//   1. Extrair o "teor puro" de intimações judiciais (sanitização semântica)
//   2. Gerar hash SHA-256 canônico para deduplicação blindada
//
// Princípio de deduplicação canônica:
//   Dois textos com o mesmo conteúdo jurídico, mas com formatação HTML
//   diferente, espaçamentos distintos ou cabeçalhos diferentes, DEVEM
//   produzir o mesmo hash. O hash representa o SIGNIFICADO, não a forma.
// =============================================================================

/**
 * Extrai o teor puro de uma intimação judicial.
 *
 * Remove sistematicamente:
 *   - Tags HTML e seus atributos
 *   - Cabeçalhos de tribunal (ex: "TRIBUNAL REGIONAL FEDERAL DA 3ª REGIÃO")
 *   - Datas em formatos brasileiros (dd/mm/aaaa, dd-mm-aaaa)
 *   - Números de processo formatados (CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO)
 *   - CPF/CNPJ (proteção LGPD)
 *   - Números da OAB (ex: OAB/SP 123.456)
 *   - CEP, telefones, e-mails
 *   - Múltiplos espaços e quebras de linha excessivas
 *
 * Preserva:
 *   - Termos jurídicos, prazos nominais ("quinze dias", "trinta dias")
 *   - Referências a artigos de lei (ex: "art. 303 do CPC")
 *   - Natureza do ato ("embargos à execução", "agravo regimental")
 */
export function extrairTeorPuro(texto: string): string {
  if (!texto || typeof texto !== "string") return "";

  let puro = texto
    // ── 1. Remove tags HTML e entidades ─────────────────────────────────────
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, " ")

    // ── 2. Remove cabeçalhos padronizados de tribunais ───────────────────────
    .replace(/TRIBUNAL\s+(REGIONAL|SUPERIOR|DE JUSTIÇA)[^\n]*/gi, "")
    .replace(/PODER JUDICIÁRIO[^\n]*/gi, "")
    .replace(/SEÇÃO JUDICIÁRIA[^\n]*/gi, "")
    .replace(/VARA\s+\w+[^\n]*/gi, "")
    .replace(/JUÍZO\s+\w+[^\n]*/gi, "")
    .replace(/DIÁRIO (DA JUSTIÇA|ELETRÔNICO)[^\n]*/gi, "")
    .replace(/DJ[ETN]?\s*[-–]?\s*\d{2}\/\d{2}\/\d{4}[^\n]*/gi, "")

    // ── 3. Remove identificadores de processo CNJ ────────────────────────────
    // Formato: NNNNNNN-DD.AAAA.J.TT.OOOO
    .replace(/\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g, "[PROCESSO]")
    // Formato alternativo sem pontuação
    .replace(/\d{20}/g, "[PROCESSO]")

    // ── 4. Proteção LGPD: remove dados pessoais ──────────────────────────────
    // CPF: XXX.XXX.XXX-XX
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "[CPF]")
    // CNPJ: XX.XXX.XXX/XXXX-XX
    .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, "[CNPJ]")
    // OAB: OAB/UF XXXXXX ou OAB nº XXXXXX
    .replace(/OAB\s*\/?\s*[A-Z]{2}\s*\d+\.?\d*/gi, "[OAB]")
    .replace(/OAB\s+n[oº°]?\s*\d+\.?\d*/gi, "[OAB]")
    // CEP: XXXXX-XXX
    .replace(/\d{5}-\d{3}/g, "[CEP]")
    // Telefone: (XX) XXXXX-XXXX ou variações
    .replace(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/g, "[TEL]")
    // E-mail
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]")

    // ── 5. Remove datas formatadas ────────────────────────────────────────────
    // dd/mm/aaaa, dd-mm-aaaa, dd.mm.aaaa
    .replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, "[DATA]")
    // Por extenso: "25 de abril de 2025", "25 de abril de 25"
    .replace(/\d{1,2}\s+de\s+\w+\s+de\s+\d{2,4}/gi, "[DATA]")
    // Apenas ano isolado como referência temporal (ex: "em 2025")
    .replace(/\bem\s+20\d{2}\b/gi, "[ANO]")

    // ── 6. Remove números de páginas e volumes ───────────────────────────────
    .replace(/\b(fls?\.?|pág\.?|página)\s*\d+/gi, "")
    .replace(/\bvol(?:ume)?\.?\s*\d+/gi, "")

    // ── 7. Normalização final ─────────────────────────────────────────────────
    // Colapsa múltiplos espaços e quebras de linha
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Limita a 3000 caracteres para embedding (modelo suporta até ~8000 tokens)
  return puro.substring(0, 3000);
}

/**
 * Normaliza o teor puro para deduplicação canônica.
 *
 * Aplicado APÓS extrairTeorPuro para garantir que:
 *   - Maiúsculas/minúsculas não diferenciam textos idênticos
 *   - Pontuação não-semântica não diferencia textos idênticos
 *   - O hash representa APENAS o conteúdo jurídico relevante
 */
export function normalizarParaHash(teorPuro: string): string {
  return teorPuro
    .toLowerCase()
    // Remove pontuação que não altera o sentido jurídico
    .replace(/[,;:!?]/g, " ")
    // Normaliza aspas
    .replace(/["""''`]/g, "")
    // Colapsa espaços novamente após normalização
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gera o hash SHA-256 canônico do teor de uma intimação.
 *
 * Fluxo:
 *   1. Extrai teor puro (remove HTML, dados pessoais, etc.)
 *   2. Normaliza para comparação canônica (lowercase, remove pontuação)
 *   3. Codifica em UTF-8
 *   4. Aplica SHA-256 via Web Crypto API (crypto.subtle — nativa no Deno/Edge)
 *   5. Converte para hexadecimal lowercase
 *
 * Garantia: textos com o mesmo conteúdo jurídico mas formatação diferente
 * SEMPRE produzem o mesmo hash.
 *
 * @param textoOriginal - Texto bruto recebido da Tramitação Inteligente
 * @returns Promise<string> - Hash SHA-256 em hexadecimal (64 chars) ou null
 */
export async function gerarHashTeor(textoOriginal: string): Promise<string | null> {
  try {
    const teorPuro = extrairTeorPuro(textoOriginal);
    if (teorPuro.length < 10) return null; // Texto irrelevante

    const canonico = normalizarParaHash(teorPuro);
    const encoder = new TextEncoder();
    const dados = encoder.encode(canonico);

    const hashBuffer = await crypto.subtle.digest("SHA-256", dados);

    // Converte ArrayBuffer para hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return hashHex;
  } catch (error) {
    console.error("[textProcessing] Erro ao gerar hash SHA-256:", error);
    return null;
  }
}

/**
 * Pipeline completo: texto bruto → {teorPuro, hash}
 * Convenience wrapper para uso no webhook.
 */
export async function processarTeorIntimacao(textoOriginal: string): Promise<{
  teorPuro: string;
  hash: string | null;
}> {
  const teorPuro = extrairTeorPuro(textoOriginal);
  const hash = await gerarHashTeor(textoOriginal);
  return { teorPuro, hash };
}
