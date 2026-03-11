// ============================================================================
// cnjService.js — Motor de Buscas do Governo (DataJud + DJEN)
// Padrão Ouro: Consulta oficial via APIs públicas do CNJ
// ============================================================================

// ─── DataJud Config ─────────────────────────────────────────────────────────
const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";
const DATAJUD_API_KEY =
  "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

// ─── DJEN Config ────────────────────────────────────────────────────────────
const DJEN_BASE = "https://comunicaapi.pje.jus.br";

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
// POST para DataJud buscando capa + movimentos de um processo pelo número.
// Retorna: { classeProcessual, assuntos, movimentos, orgaoJulgador, _raw }
// ============================================================================
export async function datajudBuscaNumero(numero) {
  const sigla = resolverTribunal(numero);
  const numeroFormatado = formatarNumeroCNJ(numero);

  const endpoint = `${DATAJUD_BASE}/api_publica_${sigla}/_search`;

  const body = {
    query: {
      match: {
        numeroProcesso: numeroFormatado,
      },
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: DATAJUD_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `DataJud erro ${response.status} (${sigla}): ${text || response.statusText}`
    );
  }

  const json = await response.json();

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
// djenBuscaPublica()
//
// GET para o Diário de Justiça Eletrônico Nacional — comunicações/intimações
// da advogada Ana Rafaela Vasconcelos Damasceno (OAB/CE 36219).
// Retorna: lista de comunicações públicas.
// ============================================================================
export async function djenBuscaPublica() {
  const params = new URLSearchParams({
    numeroOab: "36219",
    ufOab: "CE",
    nomeAdvogado: "Ana Rafaela Vasconcelos Damasceno",
  });

  const url = `${DJEN_BASE}/api/v1/comunicacao?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `DJEN erro ${response.status}: ${text || response.statusText}`
    );
  }

  const json = await response.json();

  // A API pode retornar em diferentes formatos (lista direta ou wrapper)
  const comunicacoes = Array.isArray(json)
    ? json
    : json?.comunicacoes ?? json?.items ?? json?.content ?? [];

  return {
    advogada: "Ana Rafaela Vasconcelos Damasceno",
    oab: "36219/CE",
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
  datajudBuscaNumero,
  djenBuscaPublica,
};
