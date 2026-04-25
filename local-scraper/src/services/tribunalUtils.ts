// ============================================================================
// local-scraper/src/services/tribunalUtils.ts
// Utilitários compartilhados de resolução e formatação de números CNJ.
// Extraídos do cnjService.js do frontend para reutilização no servidor.
// ============================================================================

// Mapeamento J+TT → Sigla do Tribunal
// Expandível: adicionar novos tribunais conforme necessidade do escritório
export const TRIBUNAL_MAP: Record<string, string> = {
  "8-06": "TJCE",   // Justiça Estadual do Ceará
  "4-05": "TRF5",   // TRF 5ª Região (federal)
  "1-05": "TRF5",   // Seção Judiciária / JEF CE (1ª inst. federal → TRF5)
  // Expandir conforme novos processos forem mapeados
};

/**
 * resolverTribunal(numeroCNJ)
 * Extrai J+TT do número e resolve para sigla do tribunal.
 * Aceita número com ou sem formatação (mask CNJ).
 */
export function resolverTribunal(numeroCNJ: string): string {
  const digitos = numeroCNJ.replace(/\D/g, "");

  if (digitos.length !== 20) {
    throw new Error(
      `Número CNJ inválido — esperava 20 dígitos, recebeu ${digitos.length}: "${numeroCNJ}"`
    );
  }

  const J = digitos[13];
  const TT = digitos.substring(14, 16);
  const chave = `${J}-${TT}`;
  const sigla = TRIBUNAL_MAP[chave];

  if (!sigla) {
    throw new Error(
      `Tribunal não mapeado para J=${J}, TT=${TT} (chave: ${chave}) — ` +
      `adicione em TRIBUNAL_MAP em tribunalUtils.ts`
    );
  }

  return sigla;
}

/**
 * formatarNumeroCNJ(numeroCNJ)
 * Transforma dígitos puros no formato CNJ com pontos e traço:
 *   NNNNNNN-DD.AAAA.J.TT.OOOO
 */
export function formatarNumeroCNJ(numeroCNJ: string): string {
  const d = numeroCNJ.replace(/\D/g, "");
  if (d.length !== 20) {
    throw new Error(`Número CNJ inválido para formatação: "${numeroCNJ}"`);
  }
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d[13]}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}
