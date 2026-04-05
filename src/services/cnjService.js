// ============================================================================
// cnjService.js — Motor de Buscas do Governo (DataJud + DJEN)
// DataJud: Consulta via Edge Function global (datajud-bypass) no Supabase.
// DJEN:    Consulta via Edge Function global (djen-bypass) no Supabase.
// ── Migração DJEN concluída em 2026-03-21 — Mixed Content/Geo-Block fix ──
// ── Sanitização OAB (padStart 7) adicionada em 2026-03-31 — PJe fix ──────
// ============================================================================

import { supabase } from '../lib/supabase';

// ─── Mapeamento J+TT → Sigla do Tribunal (Jurisdição do escritório: CE) ─────
const TRIBUNAL_MAP = {
  "8-06": "TJCE",  // Justiça Estadual do Ceará
  "4-05": "TRF5",  // TRF 5ª Região (2ª instância federal)
  "1-05": "TRF5",  // Seção Judiciária / JEF CE (1ª instância federal → TRF5)
};

// ============================================================================
// resolverTribunal(numeroCNJ)
// Extrai somente os 20 dígitos do número CNJ e mapeia J+TT → sigla.
// Formato esperado: NNNNNNN-DD.AAAA.J.TT.OOOO  (20 dígitos puros)
// ============================================================================
export function resolverTribunal(numeroCNJ) {
  // Remove tudo que não é dígito
  const digitos = numeroCNJ.replace(/\D/g, "");

  if (digitos.length !== 20) {
    throw new Error(
      `Número CNJ inválido — esperava 20 dígitos, recebeu ${digitos.length}: "${numeroCNJ}"`
    );
  }

  // Posições no número puro (NNNNNNNDDAAAAJTTOOOO):
  //   0-6  → NNNNNNN  (7 dígitos sequencial)
  //   7-8  → DD       (2 dígitos verificadores)
  //   9-12 → AAAA     (4 dígitos ano)
  //  13    → J        (1 dígito justiça)
  //  14-15 → TT       (2 dígitos tribunal/região)
  //  16-19 → OOOO     (4 dígitos origem)
  const J = digitos[13];
  const TT = digitos.substring(14, 16);

  const chave = `${J}-${TT}`;
  const sigla = TRIBUNAL_MAP[chave];

  if (!sigla) {
    throw new Error(
      `Tribunal não mapeado para J=${J}, TT=${TT} (chave: ${chave})`
    );
  }

  return sigla;
}

// ============================================================================
// formatarNumeroCNJ(numeroCNJ)
// Transforma dígitos puros no formato com pontos e traço:
//   NNNNNNN-DD.AAAA.J.TT.OOOO
// ============================================================================
export function formatarNumeroCNJ(numeroCNJ) {
  const d = numeroCNJ.replace(/\D/g, "");
  if (d.length !== 20) {
    throw new Error(`Número CNJ inválido para formatação: "${numeroCNJ}"`);
  }
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d[13]}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

// ============================================================================
// datajudBuscaNumero(numero)
//
// Invoca a Edge Function 'datajud-bypass' no Supabase (global, sem CORS).
// Retorna: { classeProcessual, assuntos, movimentos, orgaoJulgador, _raw }
// ============================================================================
export async function datajudBuscaNumero(numero) {
  const sigla = resolverTribunal(numero);
  const numeroFormatado = formatarNumeroCNJ(numero);

  // Força execução em sa-east-1 (São Paulo) — o DataJud/CNJ pode aplicar
  // restrições geográficas similares ao DJEN. Garante IP brasileiro.
  const { data, error } = await supabase.functions.invoke('datajud-bypass', {
    body: { sigla, numeroFormatado },
    headers: {
      'x-region': 'sa-east-1',  // Força execução em São Paulo (IP brasileiro)
    },
  });

  if (error) {
    throw new Error(`DataJud Edge Function erro (${sigla}): ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(
      `DataJud erro (${sigla}): ${data?.error || 'Resposta inesperada da Edge Function'}`
    );
  }

  const json = data.data;

  const hits = json?.hits?.hits ?? [];
  if (hits.length === 0) {
    return {
      encontrado: false,
      numero: numeroFormatado,
      tribunal: sigla,
      classeProcessual: null,
      assuntos: [],
      movimentos: [],
      orgaoJulgador: null,
      _raw: json,
    };
  }

  // Usa o primeiro hit (mais relevante)
  const source = hits[0]._source;

  return {
    encontrado: true,
    numero: source.numeroProcesso ?? numeroFormatado,
    tribunal: sigla,
    classeProcessual: source.classe ?? source.classeProcessual ?? null,
    assuntos: source.assuntos ?? [],
    movimentos: source.movimentos ?? [],
    orgaoJulgador: source.orgaoJulgador ?? null,
    dataAjuizamento: source.dataAjuizamento ?? null,
    grau: source.grau ?? null,
    nivelSigilo: source.nivelSigilo ?? null,
    formato: source.formato ?? null,
    _raw: source,
  };
}

// ============================================================================
// sanitizarNumeroOab(numeroOab)
//
// Sanitiza o número da OAB para o formato exigido pela API DJEN / PJe:
//   1. Converte para string
//   2. Remove TODOS os caracteres não-numéricos (letras de tipo, traços, etc.)
//   3. Aplica zero-padding para garantir exatamente 7 dígitos
//
// Exemplos:
//   "CE36219"  → "0036219"  (remove UF + padding)
//   "36219"    → "0036219"  (apenas padding)
//   "0036219"  → "0036219"  (idempotente)
//   "12345678" → "2345678"  (trunca pela esquerda se > 7 dígitos)
// ============================================================================
export function sanitizarNumeroOab(numeroOab) {
  // Passo 1: remove tudo que não for dígito (letras de tipo, UF embutida, etc.)
  const apenasDigitos = String(numeroOab).replace(/\D/g, "");

  if (apenasDigitos.length === 0) {
    throw new Error(
      `Número OAB inválido — nenhum dígito encontrado em: "${numeroOab}"`
    );
  }

  // Passo 2: garante exatamente 7 dígitos com zeros à esquerda
  // .padStart(7) adiciona zeros se < 7 dígitos
  // .slice(-7) garante truncamento estrito se > 7 dígitos (padStart não corta)
  return apenasDigitos.padStart(7, "0").slice(-7);
}

// ============================================================================
// djenBuscaPublica(numeroOab, ufOab, nomeAdvogado, dataInicio, dataFim)
//
// Invoca a Edge Function 'djen-bypass' no Supabase (global, sem CORS).
// Consulta comunicações/intimações da advogada via DJEN (API do CNJ).
//
// Parâmetros:
// - numeroOab: Número da OAB já sanitizado/transformado (ex: "0036219") — enviado no payload
// - numeroOabRaw: Número original da OAB (ex: "36219") — usado apenas no campo de exibição
// - ufOab: Unidade da federação da OAB (ex: "CE") — enviada separadamente
// - nomeAdvogado: Nome completo do advogado (opcional)
// - dataInicio: Data inicial de filtro (opcional, formato YYYY-MM-DD)
// - dataFim: Data final de filtro (opcional, formato YYYY-MM-DD)
//
// Retorna: { advogado, oab, oabExibicao, totalComunicacoes, comunicacoes, _raw }
//   oab         → número sanitizado usado internamente (ex: "0036219/CE")
//   oabExibicao → número original para exibição ao usuário (ex: "36219/CE")
// ============================================================================
export async function djenBuscaPublica({
  numeroOab,
  numeroOabRaw = null,
  ufOab,
  nomeAdvogado = null,
  dataDisponibilizacaoInicio = null,
  dataDisponibilizacaoFim = null,
} = {}) {
  // Validação dos parâmetros obrigatórios
  if (!numeroOab || !ufOab) {
    throw new Error("Parâmetros obrigatórios: 'numeroOab' e 'ufOab'");
  }

  // ── Sanitização OAB ────────────────────────────────────────────────────────
  // Remove letras/caracteres especiais e aplica zero-padding para 7 dígitos.
  // A API DJEN/PJe exige exatamente 7 dígitos numéricos em 'numero_oab'.
  // A UF vai separadamente em 'uf_oab' e NÃO deve estar embutida no número.
  const numeroOabSanitizado = sanitizarNumeroOab(numeroOab);
  // ──────────────────────────────────────────────────────────────────────────

  // CRÍTICO: forçar execução na região sa-east-1 (São Paulo).
  // O CloudFront do CNJ (DJEN) bloqueia IPs fora do Brasil (HTTP 403).
  // O Supabase Edge Runtime roteia para o nó mais próximo do CLIENTE,
  // que pode ser us-east-1 ou outro nó não-brasileiro.
  // O header x-region garante execução em São Paulo (IP brasileiro).
  const { data, error } = await supabase.functions.invoke('djen-bypass', {
    body: {
      numeroOab: numeroOabSanitizado,  // 7 dígitos, ex: "0036219"
      ufOab,                           // UF separada, ex: "CE"
      nomeAdvogado,
      dataDisponibilizacaoInicio,
      dataDisponibilizacaoFim,
    },
    headers: {
      'x-region': 'sa-east-1',  // Força execução em São Paulo (IP brasileiro)
    },
  });

  if (error) {
    throw new Error(`DJEN Edge Function erro: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(
      `DJEN erro: ${data?.error || 'Resposta inesperada da Edge Function'}`
    );
  }

  const json = data.data;

  // A API pode retornar em diferentes formatos (lista direta ou wrapper)
  const comunicacoes = Array.isArray(json)
    ? json
    : json?.comunicacoes ?? json?.items ?? json?.content ?? [];

  return {
    advogado: nomeAdvogado || "Advogado",
    // ── Fix 3: oab interno (sanitizado, 7 dígitos) vs oabExibicao (original) ──
    // oab: mantido para compatibilidade interna com o payload da Edge Function
    oab: `${numeroOabSanitizado}/${ufOab}`,
    // oabExibicao: usa o número bruto (sem zero-padding) para mostrar ao usuário
    // Evita exibir "0036219/CE" na UI — mostra "36219/CE" em vez disso.
    oabExibicao: numeroOabRaw
      ? `${String(numeroOabRaw).replace(/\D/g, "").replace(/^0+/, "") || numeroOabRaw}/${ufOab}`
      : `${numeroOabSanitizado}/${ufOab}`,
    totalComunicacoes: comunicacoes.length,
    comunicacoes,
    _raw: json,
  };
}

// ============================================================================
// Exportação unificada (named export pattern do projeto)
// ============================================================================
export const cnjService = {
  resolverTribunal,
  formatarNumeroCNJ,
  sanitizarNumeroOab,
  datajudBuscaNumero,
  djenBuscaPublica,
};
