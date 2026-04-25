// =============================================================================
// calculadora-prazos/core.ts — Lógica Matemática Pura (sem dependências Deno)
// =============================================================================
//
// Este módulo contém APENAS a lógica de cálculo de prazos processuais.
// É importado tanto pelo handler HTTP (index.ts) quanto pelos testes Vitest.
//
// Regras implementadas (CPC/2015):
//   - art. 219: contagem apenas em dias úteis
//   - art. 224 §1º: D1 = 1º dia útil APÓS a publicação
//   - art. 224: prorrogação automática para próximo dia útil se vencimento não útil
//   - Recesso forense: 20/12 a 20/01 (Resolução CNJ 318/2020)
//   - Feriados nacionais fixos (Lei 9.093/95) + móveis (algoritmo de Gauss)
// =============================================================================

// ============================================================================
// Constantes de Fuso Horário
// ============================================================================
/** Offset de Brasília em milissegundos (-3h = UTC-3) */
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

// ============================================================================
// Utilitários de Data com Fuso Horário de Brasília
// ============================================================================

/**
 * Converte "YYYY-MM-DD" para Date fixado ao meio-dia UTC.
 * Usar meio-dia evita bugs de DST na aritmética de datas (+/- dias).
 */
export function parseDateBrasilia(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Formata Date para "YYYY-MM-DD" no fuso de Brasília (UTC-3).
 */
export function formatDateBrasilia(date: Date): string {
  const brasiliaMs = date.getTime() + BRASILIA_OFFSET_MS;
  const d = new Date(brasiliaMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Avança a data em N dias (imutável).
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Dia da semana em Brasília: 0=Dom, 6=Sáb.
 */
export function getDayOfWeekBrasilia(date: Date): number {
  const brasiliaMs = date.getTime() + BRASILIA_OFFSET_MS;
  return new Date(brasiliaMs).getUTCDay();
}

// ============================================================================
// Algoritmo de Gauss — Cálculo da Páscoa
// ============================================================================

/**
 * Calcula a data da Páscoa para um determinado ano usando o Algoritmo de Gauss.
 * Válido para anos entre 1583 e 4099.
 * Retorna "YYYY-MM-DD".
 */
export function calcularPascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// ============================================================================
// Feriados Móveis (derivados da Páscoa)
// ============================================================================

/**
 * Feriados nacionais móveis do ano como Set de "YYYY-MM-DD".
 * Inclui: Carnaval (seg/ter), Sexta-Feira Santa, Páscoa, Corpus Christi.
 */
export function getFeriadosMoveis(ano: number): Set<string> {
  const pascoa = parseDateBrasilia(calcularPascoa(ano));
  return new Set([
    formatDateBrasilia(addDays(pascoa, -48)), // Segunda de Carnaval
    formatDateBrasilia(addDays(pascoa, -47)), // Terça de Carnaval
    formatDateBrasilia(addDays(pascoa, -2)),  // Sexta-Feira Santa (Paixão de Cristo)
    formatDateBrasilia(addDays(pascoa, 0)),   // Páscoa (Domingo)
    formatDateBrasilia(addDays(pascoa, 60)),  // Corpus Christi (+60 dias)
  ]);
}

// ============================================================================
// Feriados Nacionais Fixos
// ============================================================================

/**
 * Feriados nacionais fixos do ano como Set de "YYYY-MM-DD".
 * Base legal: Lei 9.093/95 + Lei 14.759/2023 (Consciência Negra).
 */
export function getFeriadosFixos(ano: number): Set<string> {
  const y = String(ano);
  return new Set([
    `${y}-01-01`, // Confraternização Universal
    `${y}-04-21`, // Tiradentes
    `${y}-05-01`, // Dia do Trabalho
    `${y}-09-07`, // Independência do Brasil
    `${y}-10-12`, // Nossa Senhora Aparecida
    `${y}-11-02`, // Finados
    `${y}-11-15`, // Proclamação da República
    `${y}-11-20`, // Consciência Negra
    `${y}-12-25`, // Natal
  ]);
}

/**
 * Todos os feriados de um ano (fixos + móveis) em um único Set.
 * Cache recomendado externamente para evitar recomputação em loops.
 */
export function getFeriadosAno(ano: number): Set<string> {
  return new Set([...getFeriadosFixos(ano), ...getFeriadosMoveis(ano)]);
}

// ============================================================================
// Recesso Forense (CNJ 318/2020)
// ============================================================================

/**
 * Retorna true se a data está no recesso forense (20/12 a 20/01, inclusive).
 * Resolução CNJ 318/2020: prazos SUSPENSOS — não apenas pausados.
 */
export function estaNoRecessoForense(date: Date): boolean {
  const d = new Date(date.getTime() + BRASILIA_OFFSET_MS);
  const mes = d.getUTCMonth() + 1;
  const dia = d.getUTCDate();
  if (mes === 12 && dia >= 20) return true;
  if (mes === 1 && dia <= 20) return true;
  return false;
}

// ============================================================================
// Verificador de Dia Não Útil
// ============================================================================

/**
 * Retorna true se a data NÃO é dia útil (fim de semana, feriado ou recesso).
 */
export function isNaoUtil(date: Date, feriadosSet: Set<string>): boolean {
  const dow = getDayOfWeekBrasilia(date);
  if (dow === 0 || dow === 6) return true;
  if (feriadosSet.has(formatDateBrasilia(date))) return true;
  if (estaNoRecessoForense(date)) return true;
  return false;
}

// ============================================================================
// Interfaces públicas
// ============================================================================

export interface InputPrazo {
  data_publicacao: string; // "YYYY-MM-DD"
  dias_prazo: number;
  dias_uteis?: boolean;   // Default: true (CPC/2015 art. 219)
}

export interface ResultadoPrazo {
  due_date: string;
  d1_prazo: string;
  total_dias_corridos: number;
  feriados_pulados: string[];
  recesso_aplicado: boolean;
  pascoa_do_ano: string;
}

// ============================================================================
// Cálculo Principal do Prazo (CPC/2015)
// ============================================================================

/**
 * Calcula a data de vencimento de um prazo processual (CPC/2015).
 *
 * Regras aplicadas:
 * 1. D0 = data de publicação — NÃO entra na contagem
 * 2. D1 = 1º dia útil APÓS a publicação (art. 224 §1º)
 * 3. Se D1 cair em recesso, avança para 21/01 do ano correspondente
 * 4. Conta `dias_prazo` dias úteis a partir de D1 (D1 = dia 1)
 * 5. Se vencimento em dia não útil, prorroga para o próximo dia útil (art. 224)
 */
export function calcularPrazo(input: InputPrazo): ResultadoPrazo {
  const { data_publicacao, dias_prazo, dias_uteis = true } = input;

  if (!data_publicacao || !dias_prazo || dias_prazo <= 0) {
    throw new Error("Parâmetros inválidos: data_publicacao e dias_prazo (> 0) são obrigatórios.");
  }

  const d0 = parseDateBrasilia(data_publicacao);
  const anoPublicacao = new Date(d0.getTime() + BRASILIA_OFFSET_MS).getUTCFullYear();

  // Cache de feriados por ano (evita recalcular em cada iteração)
  const cacheAnos = new Map<number, Set<string>>();
  const getFeriados = (ano: number) => {
    if (!cacheAnos.has(ano)) cacheAnos.set(ano, getFeriadosAno(ano));
    return cacheAnos.get(ano)!;
  };
  getFeriados(anoPublicacao); // Pré-carrega

  const feriadosPulados: string[] = [];
  let recessoAplicado = false;

  // ── D1: 1º dia útil APÓS a publicação (CPC art. 224 §1º) ─────────────────
  let d1 = addDays(d0, 1);
  let iteracoes = 0;

  while (isNaoUtil(d1, getFeriados(new Date(d1.getTime() + BRASILIA_OFFSET_MS).getUTCFullYear()))) {
    if (estaNoRecessoForense(d1)) {
      recessoAplicado = true;
      // Salta direto para 21/01 (primeiro candidato após o recesso)
      const brasiliaD1 = new Date(d1.getTime() + BRASILIA_OFFSET_MS);
      const anoRecesso = brasiliaD1.getUTCMonth() === 11 // Dezembro
        ? brasiliaD1.getUTCFullYear() + 1
        : brasiliaD1.getUTCFullYear();
      d1 = parseDateBrasilia(`${anoRecesso}-01-21`);
    } else {
      d1 = addDays(d1, 1);
    }
    if (++iteracoes > 400) throw new Error("Loop infinito ao buscar D1.");
  }

  // ── Contagem dos dias úteis ───────────────────────────────────────────────
  let current = d1;
  let diasContados = 1; // D1 = dia 1

  if (dias_uteis) {
    while (diasContados < dias_prazo) {
      current = addDays(current, 1);
      const anoAtual = new Date(current.getTime() + BRASILIA_OFFSET_MS).getUTCFullYear();
      const feriadosAno = getFeriados(anoAtual);

      if (isNaoUtil(current, feriadosAno)) {
        const dateStr = formatDateBrasilia(current);
        if (!feriadosPulados.includes(dateStr)) feriadosPulados.push(dateStr);
        if (estaNoRecessoForense(current)) recessoAplicado = true;
        // Não incrementa diasContados — continua avançando
      } else {
        diasContados++;
      }

      if (feriadosPulados.length > 1000) throw new Error("Prazo excede limite de 1000 dias não úteis.");
    }
  } else {
    // Dias corridos: avança direto
    current = addDays(d1, dias_prazo - 1);
  }

  // ── Prorrogação se vencimento em dia não útil (CPC art. 224) ─────────────
  iteracoes = 0;
  while (isNaoUtil(current, getFeriados(new Date(current.getTime() + BRASILIA_OFFSET_MS).getUTCFullYear()))) {
    current = addDays(current, 1);
    if (estaNoRecessoForense(current)) recessoAplicado = true;
    if (++iteracoes > 400) throw new Error("Loop infinito ao buscar vencimento.");
  }

  return {
    due_date: formatDateBrasilia(current),
    d1_prazo: formatDateBrasilia(d1),
    total_dias_corridos: Math.round((current.getTime() - d0.getTime()) / (24 * 60 * 60 * 1000)),
    feriados_pulados: feriadosPulados,
    recesso_aplicado: recessoAplicado,
    pascoa_do_ano: calcularPascoa(anoPublicacao),
  };
}
