import { describe, expect, it } from "vitest";
import { classifyPrevidenciaryEligibility } from "../supabase/functions/scrape-trf5/previdenciary-filter";

describe("scrape-trf5 previdenciary filter", () => {
  it("keeps a clear LOAS/BPC benefit judgment", () => {
    const eligibility = classifyPrevidenciaryEligibility({
      process_number: "00030227020244058109",
      trial_date: "2025-10-15",
      orgao_julgador: "1a RELATORIA DA 1a TURMA RECURSAL DO CEARA",
      tema: "beneficio assistencial",
      excerpt: "EMENTA. PREVIDENCIARIO. BENEFICIO ASSISTENCIAL. BPC/LOAS. REQUISITOS PREENCHIDOS.",
      full_text: "A parte autora comprovou impedimento de longo prazo e miserabilidade para concessao de LOAS.",
    });

    expect(eligibility.eligible).toBe(true);
    expect(eligibility.reason).toBe("benefit_terms");
    expect(eligibility.matchedTerms).toContain("bpc");
    expect(eligibility.matchedTerms).toContain("loas");
  });

  it("ignores an out-of-scope improbity judgment with loss of object", () => {
    const eligibility = classifyPrevidenciaryEligibility({
      process_number: "00011112220244058100",
      trial_date: "2025-10-16",
      orgao_julgador: "1a RELATORIA DA 1a TURMA RECURSAL DO CEARA",
      tema: "recurso prejudicado",
      excerpt: "EMENTA. PROCESSUAL CIVIL. RECURSO PREJUDICADO. PERDA DO OBJETO.",
      full_text: "Discussao vinculada a acao de improbidade administrativa. Ausencia de materia previdenciaria.",
    });

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toBe("excluded_terms_without_benefit");
    expect(eligibility.excludedTerms).toContain("improbidade administrativa");
    expect(eligibility.excludedTerms).toContain("perda do objeto");
  });
});
