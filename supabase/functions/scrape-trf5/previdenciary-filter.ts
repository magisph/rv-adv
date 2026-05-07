interface PrevidenciaryFilterInput {
  excerpt?: string | null;
  full_text?: string | null;
  tema?: string | null;
  process_number?: string | null;
  orgao_julgador?: string | null;
  trial_date?: string | null;
}

export interface PrevidenciaryEligibility {
  eligible: boolean;
  reason: string | null;
  matchedTerms: string[];
  excludedTerms: string[];
}

const BENEFIT_TERMS = [
  "loas",
  "bpc",
  "beneficio assistencial",
  "amparo social",
  "aposentadoria por idade",
  "aposentadoria por idade rural",
  "aposentadoria por idade urbana",
  "aposentadoria por idade do segurado especial",
  "segurado especial",
  "beneficio por incapacidade",
  "auxilio doenca",
  "auxilio por incapacidade temporaria",
  "aposentadoria por invalidez",
  "aposentadoria por incapacidade permanente",
  "incapacidade temporaria",
  "incapacidade permanente",
  "pensao por morte",
  "salario maternidade",
] as const;

const RURAL_TERMS = [
  "trabalhador rural",
  "ruricola",
] as const;

const AUXILIARY_TERMS = [
  "inss",
  "previdenciario",
  "beneficio",
  "beneficios",
  "aposentadoria",
  "incapacidade",
  "pensao",
  "salario maternidade",
] as const;

const EXCLUSION_TERMS = [
  "improbidade administrativa",
  "acao de improbidade",
  "acao civil publica",
  "fgts",
  "fundo de garantia",
  "juros progressivos",
  "servidor publico",
  "concurso publico",
  "execucao fiscal",
  "tributario",
  "penal",
  "crime",
  "habeas corpus",
  "mandado de seguranca",
  "licitacao",
  "ambiental",
  "desapropriacao",
] as const;

const PROCEDURAL_TERMS = [
  "perda do objeto",
  "recurso prejudicado",
  "agravo de instrumento",
  "tutela de urgencia",
  "extincao sem resolucao do merito",
  "art 485",
  "sem resolucao do merito",
] as const;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\bart\.\s*/g, "art ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectTerms(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

export function classifyPrevidenciaryEligibility(
  input: PrevidenciaryFilterInput,
): PrevidenciaryEligibility {
  const text = normalizeText([
    input.tema,
    input.excerpt,
    input.full_text,
    input.process_number,
    input.orgao_julgador,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join(" "));

  const benefitMatches = collectTerms(text, BENEFIT_TERMS);
  const ruralMatches = collectTerms(text, RURAL_TERMS);
  const auxiliaryMatches = collectTerms(text, AUXILIARY_TERMS);
  const exclusionMatches = collectTerms(text, EXCLUSION_TERMS);
  const proceduralMatches = collectTerms(text, PROCEDURAL_TERMS);
  const matchedTerms = [...new Set([...benefitMatches, ...ruralMatches, ...auxiliaryMatches])];
  const excludedTerms = [...new Set([...exclusionMatches, ...proceduralMatches])];
  const hasBenefit = benefitMatches.length > 0;
  const hasRuralPrevidenciaryContext = ruralMatches.length > 0 && auxiliaryMatches.length > 0;
  const hasAuxiliaryContext = auxiliaryMatches.length >= 2 && exclusionMatches.length === 0;

  if (hasBenefit) {
    return {
      eligible: true,
      reason: "benefit_terms",
      matchedTerms,
      excludedTerms,
    };
  }

  if (hasRuralPrevidenciaryContext) {
    return {
      eligible: true,
      reason: "rural_previdenciary_context",
      matchedTerms,
      excludedTerms,
    };
  }

  if (exclusionMatches.length > 0) {
    return {
      eligible: false,
      reason: "excluded_terms_without_benefit",
      matchedTerms,
      excludedTerms,
    };
  }

  if (proceduralMatches.length > 0) {
    return {
      eligible: false,
      reason: "procedural_without_benefit",
      matchedTerms,
      excludedTerms,
    };
  }

  if (hasAuxiliaryContext) {
    return {
      eligible: true,
      reason: "auxiliary_previdenciary_context",
      matchedTerms,
      excludedTerms,
    };
  }

  return {
    eligible: false,
    reason: "no_previdenciary_benefit_terms",
    matchedTerms,
    excludedTerms,
  };
}
