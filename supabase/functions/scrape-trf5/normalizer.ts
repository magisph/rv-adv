export interface Trf5RawDocument {
  codigoDocumento?: string | null;
  numeroProcesso?: string | null;
  dataJulgamento?: string | null;
  dataAssinatura?: string | null;
  relator?: string | null;
  orgaoJulgador?: string | null;
  texto?: string | null;
  resumo?: string | null;
  url?: string | null;
}

export interface NormalizedJurisprudence {
  process_number: string;
  process_number_raw: string | null;
  trial_date: string | null;
  relator: string | null;
  orgao_julgador: string | null;
  excerpt: string;
  full_text: string | null;
  source: "trf5";
  jurisdicao: "CE";
  source_url: string | null;
  external_id: string | null;
  tema: string;
}

export function nullIfEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeProcessNumber(value: unknown): string | null {
  const normalized = nullIfEmpty(value);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function normalizeDate(value: unknown): string | null {
  const normalized = nullIfEmpty(value);
  if (!normalized) return null;

  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return null;
}

export function formatDateToBr(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractExcerpt(text: string): string {
  const clean = stripHtml(text);
  if (!clean) return "";

  const upper = clean.toUpperCase();
  const ementaIndexes = [...upper.matchAll(/\bEMENTA\b/g)].map((match) => match.index ?? 0);
  const start = ementaIndexes.length > 1 ? ementaIndexes[1] : ementaIndexes[0] ?? 0;
  const afterStart = clean.slice(start);
  const endMatch = afterStart.search(/\b(RELATORIO|RELATÓRIO|VOTO|ACORDAO|ACÓRDÃO)\b/i);
  const excerpt = endMatch > 0 ? afterStart.slice(0, endMatch) : afterStart;

  return excerpt.trim().slice(0, 25_000);
}

export function inferTema(excerpt: string, fallback = "previdenciario"): string {
  const withoutPrefix = excerpt.replace(/^EMENTA\s*[:.-]?\s*/i, "");
  const firstSentence = withoutPrefix.split(/[.;]/)[0]?.trim();
  return (firstSentence || fallback).slice(0, 200).toLowerCase();
}

export function isCearaTrf5Document(raw: Trf5RawDocument): boolean {
  const orgaoJulgador = nullIfEmpty(raw.orgaoJulgador)?.toUpperCase() ?? "";
  const processNumber = normalizeProcessNumber(raw.numeroProcesso) ?? "";

  return orgaoJulgador.includes("/CE") || processNumber.includes("40581");
}

export function normalizeTrf5Document(raw: Trf5RawDocument): NormalizedJurisprudence | null {
  if (!isCearaTrf5Document(raw)) return null;

  const processNumber = normalizeProcessNumber(raw.numeroProcesso);
  const fullText = nullIfEmpty(raw.texto);
  const excerpt = fullText ? extractExcerpt(fullText) : nullIfEmpty(raw.resumo);

  if (!processNumber || !excerpt || excerpt.length < 30) return null;

  return {
    process_number: processNumber,
    process_number_raw: nullIfEmpty(raw.numeroProcesso),
    trial_date: normalizeDate(raw.dataJulgamento ?? raw.dataAssinatura),
    relator: nullIfEmpty(raw.relator),
    orgao_julgador: nullIfEmpty(raw.orgaoJulgador),
    excerpt,
    full_text: fullText,
    source: "trf5",
    jurisdicao: "CE",
    source_url: nullIfEmpty(raw.url),
    external_id: nullIfEmpty(raw.codigoDocumento),
    tema: inferTema(excerpt),
  };
}
