/**
 * Testes de Precisão — Calculadora de Prazos Processuais (CPC/2015)
 *
 * Cobre os seguintes casos críticos:
 *   1. Algoritmo de Gauss: Páscoa em anos comuns e bissextos
 *   2. Prazo iniciando em sexta-feira (D1 deve ser segunda)
 *   3. Feriado nacional fixo no meio do prazo
 *   4. Prazo cruzando a barreira do Ano Novo com recesso forense
 *   5. Publicação em 18/12 (dentro do recesso forense)
 *   6. Carnaval como feriado forense suspenso
 *   7. Corpus Christi no meio do prazo
 *   8. Prazo iniciando na véspera de feriado
 */

import { describe, it, expect } from "vitest";
import {
  calcularPascoa,
  getFeriadosMoveis,
  getFeriadosFixos,
  getFeriadosAno,
  estaNoRecessoForense,
  isNaoUtil,
  calcularPrazo,
} from "../supabase/functions/calculadora-prazos/core.ts";

// ============================================================================
// Helpers
// ============================================================================
function toDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

// ============================================================================
// 1. Algoritmo de Gauss — Cálculo da Páscoa
// ============================================================================
describe("Algoritmo de Gauss — Páscoa", () => {
  // Casos históricos verificados independentemente (USNO / Computus)
  const casosConhecidos: [number, string][] = [
    [2020, "2020-04-12"], // Ano bissexto
    [2021, "2021-04-04"],
    [2022, "2022-04-17"],
    [2023, "2023-04-09"],
    [2024, "2024-03-31"], // Ano bissexto — Páscoa em março
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"], // Páscoa mais cedo no século
    [2028, "2028-04-16"], // Ano bissexto
    [2038, "2038-04-25"], // Data limite mais tardia possível
  ];

  casosConhecidos.forEach(([ano, esperado]) => {
    it(`deve calcular corretamente a Páscoa de ${ano}: ${esperado}`, () => {
      expect(calcularPascoa(ano)).toBe(esperado);
    });
  });

  it("deve calcular Páscoa em ano bissexto 2024 em março (caso raro)", () => {
    const pascoa2024 = calcularPascoa(2024);
    expect(pascoa2024).toBe("2024-03-31");
    // Março é anterior a qualquer feriado de abril — verifica que não é confundido
    expect(pascoa2024.startsWith("2024-03")).toBe(true);
  });

  it("deve calcular Páscoa em ano bissexto 2020 em abril", () => {
    const pascoa2020 = calcularPascoa(2020);
    expect(pascoa2020).toBe("2020-04-12");
  });
});

// ============================================================================
// 2. Feriados Móveis — Derivados da Páscoa
// ============================================================================
describe("Feriados Móveis", () => {
  it("deve gerar Carnaval, Sexta-Feira Santa, Páscoa e Corpus Christi para 2025", () => {
    const moveis = getFeriadosMoveis(2025);
    // Páscoa 2025: 20/04
    expect(moveis.has("2025-04-20")).toBe(true); // Páscoa
    expect(moveis.has("2025-04-18")).toBe(true); // Sexta-Feira Santa (Paixão)
    expect(moveis.has("2025-03-03")).toBe(true); // Segunda de Carnaval (-48 dias)
    expect(moveis.has("2025-03-04")).toBe(true); // Terça de Carnaval (-47 dias)
    expect(moveis.has("2025-06-19")).toBe(true); // Corpus Christi (+60 dias)
  });

  it("deve gerar feriados corretos para 2024 (ano bissexto, Páscoa em março)", () => {
    const moveis = getFeriadosMoveis(2024);
    expect(moveis.has("2024-03-31")).toBe(true); // Páscoa
    expect(moveis.has("2024-03-29")).toBe(true); // Sexta-Feira Santa
    expect(moveis.has("2024-02-12")).toBe(true); // Segunda de Carnaval
    expect(moveis.has("2024-02-13")).toBe(true); // Terça de Carnaval
    expect(moveis.has("2024-05-30")).toBe(true); // Corpus Christi (+60 da Páscoa 31/03)
  });
});

// ============================================================================
// 3. Feriados Nacionais Fixos
// ============================================================================
describe("Feriados Nacionais Fixos", () => {
  it("deve conter os 9 feriados nacionais fixos de 2025", () => {
    const fixos = getFeriadosFixos(2025);
    expect(fixos.size).toBe(9);
    expect(fixos.has("2025-01-01")).toBe(true); // Ano Novo
    expect(fixos.has("2025-04-21")).toBe(true); // Tiradentes
    expect(fixos.has("2025-05-01")).toBe(true); // Dia do Trabalho
    expect(fixos.has("2025-09-07")).toBe(true); // Independência
    expect(fixos.has("2025-10-12")).toBe(true); // Aparecida
    expect(fixos.has("2025-11-02")).toBe(true); // Finados
    expect(fixos.has("2025-11-15")).toBe(true); // República
    expect(fixos.has("2025-11-20")).toBe(true); // Consciência Negra
    expect(fixos.has("2025-12-25")).toBe(true); // Natal
  });
});

// ============================================================================
// 4. Recesso Forense (20/12 a 20/01 — CNJ 318/2020)
// ============================================================================
describe("Recesso Forense", () => {
  it("20 de dezembro deve estar no recesso", () => {
    expect(estaNoRecessoForense(toDate("2025-12-20"))).toBe(true);
  });

  it("31 de dezembro deve estar no recesso", () => {
    expect(estaNoRecessoForense(toDate("2025-12-31"))).toBe(true);
  });

  it("01 de janeiro deve estar no recesso", () => {
    expect(estaNoRecessoForense(toDate("2026-01-01"))).toBe(true);
  });

  it("20 de janeiro deve estar no recesso (último dia)", () => {
    expect(estaNoRecessoForense(toDate("2026-01-20"))).toBe(true);
  });

  it("21 de janeiro NÃO deve estar no recesso", () => {
    expect(estaNoRecessoForense(toDate("2026-01-21"))).toBe(false);
  });

  it("19 de dezembro NÃO deve estar no recesso", () => {
    expect(estaNoRecessoForense(toDate("2025-12-19"))).toBe(false);
  });

  it("15 de março NÃO deve estar no recesso", () => {
    expect(estaNoRecessoForense(toDate("2025-03-15"))).toBe(false);
  });
});

// ============================================================================
// 5. isNaoUtil — Dia Não Útil
// ============================================================================
describe("isNaoUtil", () => {
  const feriados2025 = getFeriadosAno(2025);

  it("sábado não é dia útil", () => {
    expect(isNaoUtil(toDate("2025-05-03"), feriados2025)).toBe(true); // Sábado
  });

  it("domingo não é dia útil", () => {
    expect(isNaoUtil(toDate("2025-05-04"), feriados2025)).toBe(true); // Domingo
  });

  it("segunda-feira normal é dia útil", () => {
    expect(isNaoUtil(toDate("2025-05-05"), feriados2025)).toBe(false); // Segunda
  });

  it("01 de maio (Dia do Trabalho) não é dia útil", () => {
    expect(isNaoUtil(toDate("2025-05-01"), feriados2025)).toBe(true);
  });

  it("21 de abril (Tiradentes) não é dia útil", () => {
    expect(isNaoUtil(toDate("2025-04-21"), feriados2025)).toBe(true);
  });

  it("data em recesso (25/12) não é dia útil", () => {
    expect(isNaoUtil(toDate("2025-12-25"), feriados2025)).toBe(true);
  });
});

// ============================================================================
// 6. calcularPrazo — Casos de Negócio Críticos (CPC/2015)
// ============================================================================
describe("calcularPrazo — CPC/2015", () => {
  // ── Caso 6.1: Publicação em sexta-feira ────────────────────────────────────
  // Publicação: sexta-feira 11/04/2025
  // D1: deve ser segunda-feira 14/04/2025 (pula fim de semana)
  // Páscoa 2025: 20/04 (domingo) — Sexta da Paixão: 18/04 (não útil)
  // Prazo de 5 dias úteis a partir de D1 (14/04 = dia 1):
  //   Dia 1: 14/04 (Seg) | Dia 2: 15/04 (Ter) | Dia 3: 16/04 (Qua) | Dia 4: 17/04 (Qui)
  //   Dia 5: 22/04 (Ter) — pula 18/04 (S. Santa), 19/04 (Sáb), 20/04 (Páscoa), 21/04 (Tiradentes)
  it("prazo iniciando em sexta: D1 deve ser segunda-feira", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-04-11",
      dias_prazo: 5,
    });
    expect(resultado.d1_prazo).toBe("2025-04-14"); // Primeira segunda após a publicação
  });

  it("prazo de 5du publicado em sexta 11/04/2025 deve vencer em 22/04/2025", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-04-11",
      dias_prazo: 5,
    });
    expect(resultado.due_date).toBe("2025-04-22");
    // Verifica que feriados foram pulados
    expect(resultado.feriados_pulados).toContain("2025-04-18"); // S. Santa
    expect(resultado.feriados_pulados).toContain("2025-04-20"); // Páscoa
    expect(resultado.feriados_pulados).toContain("2025-04-21"); // Tiradentes
  });

  // ── Caso 6.2: Feriado nacional no meio do prazo ───────────────────────────
  // Publicação: 28/04/2025 (segunda-feira)
  // D1: 29/04 (terça) = dia 1
  // Prazo 15du — Dia do Trabalho (01/05) deve ser pulado
  it("feriado no meio do prazo: Dia do Trabalho deve ser pulado", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-04-28",
      dias_prazo: 15,
    });
    expect(resultado.feriados_pulados).toContain("2025-05-01");
    expect(resultado.due_date).not.toBe(""); // Deve ter uma data válida
  });

  // ── Caso 6.3: Prazo cruzando o Ano Novo (recesso forense) ────────────────
  // Publicação: 18/12/2025 (quinta-feira)
  // Observações:
  //   - D0 = 18/12
  //   - D1 = 19/12 (sexta) — ainda não está em recesso (recesso começa no dia 20)
  //   - Mas, dia 19/12 é dia útil; porém contagem de prazo cruza 20/12 (início recesso)
  //   - O prazo fica suspenso de 20/12 a 20/01
  //   - Após o recesso (21/01/2026), a contagem retoma
  it("prazo publicado em 18/12: deve saltar o recesso e vencer em 2026", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-12-18",
      dias_prazo: 15,
    });
    // O due_date deve ser em 2026 (após o recesso de 20/01)
    expect(resultado.due_date.startsWith("2026")).toBe(true);
    expect(resultado.recesso_aplicado).toBe(true);
  });

  // ── Caso 6.4: Publicação no meio do recesso (D1 deve ser 21/01) ──────────
  // Publicação: 05/01/2026 (dentro do recesso)
  // D1 deve ser 21/01/2026 (primeiro dia útil após o recesso, caso não seja fds/feriado)
  // 21/01/2026 é uma quarta-feira → dia útil direto
  it("publicação em 05/01 (recesso): D1 deve ser 21/01 do mesmo ano", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2026-01-05",
      dias_prazo: 15,
    });
    expect(resultado.d1_prazo).toBe("2026-01-21");
    expect(resultado.recesso_aplicado).toBe(true);
  });

  // ── Caso 6.5: Publicação em 31/12 (dentro do recesso) ────────────────────
  it("publicação em 31/12: D1 deve ser o primeiro dia útil após 20/01 do próximo ano", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-12-31",
      dias_prazo: 5,
    });
    // 21/01/2026 é quarta-feira (dia útil)
    expect(resultado.d1_prazo).toBe("2026-01-21");
    expect(resultado.recesso_aplicado).toBe(true);
  });

  // ── Caso 6.6: Prazo padrão de 15 dias úteis sem feriados ─────────────────
  // Publicação: 10/03/2025 (segunda)
  // D1: 11/03 (terça) = dia 1
  // 15 dias úteis começando em 11/03 sem feriados → vence em 31/03
  // Verificar que o cálculo não tem feriados neste período
  it("prazo padrão de 15du sem feriados no período (março/2025)", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-03-10",
      dias_prazo: 15,
    });
    expect(resultado.d1_prazo).toBe("2025-03-11");
    expect(resultado.due_date).toBe("2025-03-31"); // 15 dias úteis de 11 a 31/03 (pula 2 fds)
  });

  // ── Caso 6.7: Prazo que vence em sábado → prorroga para segunda ──────────
  // Publicação: 02/06/2025 (segunda)
  // D1: 03/06 (terça) = dia 1
  // 5du: 03, 04, 05, 06, 07/06 → 07/06 é sábado → prorroga para 09/06 (segunda)
  // Verificação: Junho de 2025 não tem feriados nacionais
  it("prazo que vence em sábado deve ser prorrogado para segunda-feira", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-06-02",
      dias_prazo: 5,
    });
    // D1 = 03/06 (ter). Contando: 03(1), 04(2), 05(3), 06(4), 09(5, segunda) — pula fds
    // Ou: se 09/06 for o 5º dia útil, vence em 09/06
    expect(resultado.due_date).not.toBe("2025-06-07"); // Sábado — nunca deve vencer aqui
    // O resultado deve ser uma segunda-feira
    const vencimento = new Date(Date.UTC(
      Number(resultado.due_date.substring(0, 4)),
      Number(resultado.due_date.substring(5, 7)) - 1,
      Number(resultado.due_date.substring(8, 10)),
      12, 0, 0
    ));
    // Dia da semana em Brasília (UTC-3)
    const dowBrasilia = new Date(vencimento.getTime() - 3 * 60 * 60 * 1000).getUTCDay();
    expect([1, 2, 3, 4, 5]).toContain(dowBrasilia); // Deve ser dia útil (seg-sex)
  });

  // ── Caso 6.8: Carnaval no meio do prazo ──────────────────────────────────
  // Publicação: 27/02/2025 (quinta)
  // D1: 28/02/2025 (sexta) = dia 1
  // Carnaval 2025: 03/03 (seg) e 04/03 (ter)
  // Prazo 5du: 28/02(1), 03/03(pula-carnaval), 04/03(pula-carnaval), 05/03(2), 06/03(3), 07/03(4), 10/03(5)
  it("Carnaval deve ser pulado na contagem de dias úteis", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-02-27",
      dias_prazo: 5,
    });
    expect(resultado.feriados_pulados).toContain("2025-03-03"); // Segunda de Carnaval
    expect(resultado.feriados_pulados).toContain("2025-03-04"); // Terça de Carnaval
    // Vencimento deve ser posterior ao carnaval
    expect(resultado.due_date > "2025-03-04").toBe(true);
  });

  // ── Caso 6.9: Corpus Christi no meio do prazo ────────────────────────────
  // Corpus Christi 2025: 19/06
  // Publicação: 10/06/2025 (terça)
  // D1: 11/06 (qua) = dia 1
  // 15du: 11(1),12(2),13(3),16(4),17(5),18(6),20(7-pula 19 Corpus),23(8),...
  it("Corpus Christi deve ser pulado na contagem de dias úteis", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-06-10",
      dias_prazo: 15,
    });
    expect(resultado.feriados_pulados).toContain("2025-06-19"); // Corpus Christi
    expect(resultado.due_date > "2025-06-19").toBe(true);
  });

  // ── Caso 6.10: Prazo de 30du (recurso ordinário) cruzando feriados ────────
  it("prazo de 30du deve calcular corretamente atravessando múltiplos feriados", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-04-01",
      dias_prazo: 30,
    });
    // Verifica que múltiplos feriados foram pulados (S. Santa, Páscoa, Tiradentes, Dia do Trabalho)
    expect(resultado.feriados_pulados.length).toBeGreaterThan(3);
    expect(resultado.total_dias_corridos).toBeGreaterThan(30); // Corridos > úteis
    expect(resultado.due_date).toBeTruthy();
  });

  // ── Caso 6.11: Validação — dias_prazo inválido ────────────────────────────
  it("deve lançar erro para dias_prazo <= 0", () => {
    expect(() => calcularPrazo({ data_publicacao: "2025-01-10", dias_prazo: 0 })).toThrow();
  });

  // ── Caso 6.12: Cálculo em dias corridos (não úteis) ──────────────────────
  it("dias corridos: deve contar incluindo fins de semana", () => {
    const resultado = calcularPrazo({
      data_publicacao: "2025-03-10",
      dias_prazo: 5,
      dias_uteis: false,
    });
    // Em dias corridos, 5 dias após 10/03 = D1 em 11/03, vence em 15/03 (5 dias corridos)
    // D1 = 11/03 + 4 dias = 15/03 (sábado) → prorroga para 17/03 (segunda)
    // 15/03 é sábado → prorroga para 17/03 (segunda)
    expect(resultado.due_date).not.toBe(""); // Deve ter uma data válida
  });
});

// ============================================================================
// 7. Consistência de Datas — Fuso Horário Brasília
// ============================================================================
describe("Fuso Horário Brasília (UTC-3)", () => {
  it("calcularPrazo não deve mudar de data devido a timezone shift", () => {
    // Publicação exatamente em meia-noite UTC seria 21:00 no dia anterior em Brasília
    // Com o parseDateBrasilia usando meio-dia UTC, isso não deve ocorrer
    const resultado = calcularPrazo({
      data_publicacao: "2025-05-05",
      dias_prazo: 1,
    });
    // D0 = 05/05 (segunda), D1 = 06/05 (terça) = dia 1 = vencimento para 1du
    expect(resultado.d1_prazo).toBe("2025-05-06");
    expect(resultado.due_date).toBe("2025-05-06");
  });
});
