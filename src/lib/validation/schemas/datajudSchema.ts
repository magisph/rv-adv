/**
 * datajudSchema.ts — Validação Zod para consultas bulk ao DataJud
 *
 * Usado em:
 *   - RadarBulkDataJud.jsx (validação client-side com React Hook Form)
 *   - datajud-bulk-proxy/index.ts (validação server-side na Edge Function)
 *
 * @module validation/schemas/datajudSchema
 */

import { z } from "zod";

// ─── Regex CNJ ────────────────────────────────────────────────────────────────

/**
 * Expressão regular para validar o formato CNJ formatado:
 * NNNNNNN-DD.AAAA.J.TT.OOOO
 *
 * Exemplos válidos:
 *   "0001234-56.2023.8.06.0001"  (TJCE)
 *   "0004567-89.2022.4.05.8100"  (TRF5)
 */
export const REGEX_CNJ_FORMATADO =
  /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

/**
 * Regex para número CNJ em formato puro (20 dígitos sem pontuação).
 * Útil para validação antes da formatação.
 */
export const REGEX_CNJ_PURO = /^\d{20}$/;

// ─── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Schema base para um número de processo CNJ.
 * Aceita o formato formatado (com máscara) OU os 20 dígitos puros.
 */
export const numeroCNJSchema = z.union([
  z.string().regex(
    REGEX_CNJ_FORMATADO,
    "Formato CNJ inválido. Use: NNNNNNN-DD.AAAA.J.TT.OOOO"
  ),
  z.string().regex(
    REGEX_CNJ_PURO,
    "Número CNJ puro inválido. Deve ter exatamente 20 dígitos"
  ),
]);

/**
 * Schema para consulta bulk ao DataJud.
 *
 * Validações:
 *   - Array de números CNJ (formatados ou puros)
 *   - Mínimo 1, máximo 50 processos por lote (limite DataJud)
 *   - Regex rigorosa para evitar injection
 */
export const datajudBulkSchema = z.object({
  processos: z
    .array(numeroCNJSchema)
    .min(1, "Informe pelo menos 1 número de processo")
    .max(50, "Máximo de 50 processos por lote"),
});

/**
 * Schema para consulta individual (mantém compatibilidade com datajudBuscaNumero)
 */
export const datajudSingleSchema = z.object({
  numeroCNJ: numeroCNJSchema,
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DatajudBulkInput = z.infer<typeof datajudBulkSchema>;
export type DatajudSingleInput = z.infer<typeof datajudSingleSchema>;

// ─── Resultado normalizado ────────────────────────────────────────────────────

/**
 * Schema do resultado retornado pela Edge Function datajud-bulk-proxy
 * para validação opcional client-side.
 */
export const datajudResultadoSchema = z.object({
  numero: z.string(),
  tribunal: z.string(),
  encontrado: z.boolean(),
  classeProcessual: z.unknown().nullable(),
  assuntos: z.array(z.unknown()),
  movimentos: z.array(z.unknown()),
  orgaoJulgador: z.unknown().nullable(),
  dataAjuizamento: z.string().nullable(),
  grau: z.string().nullable(),
  nivelSigilo: z.number().nullable(),
  formato: z.string().nullable(),
  erro: z.string().optional(),
});

export const datajudBulkResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      total: z.number(),
      encontrados: z.number(),
      resultados: z.array(datajudResultadoSchema),
      erros: z.array(
        z.object({ numero: z.string(), erro: z.string() })
      ),
      duracao_ms: z.number(),
    })
    .optional(),
  error: z.string().optional(),
});

export type DatajudResultado = z.infer<typeof datajudResultadoSchema>;
export type DatajudBulkResponse = z.infer<typeof datajudBulkResponseSchema>;
