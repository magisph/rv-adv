import { z } from 'zod';

const DATE_BR_REGEX = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
const MAX_TRF5_PAGES_PER_TERM = 50;
const TERM_SEPARATOR_REGEX = /[;]+/;

const parseDateBr = (dateStr: string) => {
  const [day, month, year] = dateStr.split('/');
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

const isValidDateBr = (dateStr: string) => {
  if (!DATE_BR_REGEX.test(dateStr)) return false;

  const [day, month, year] = dateStr.split('/').map(Number);
  const parsed = parseDateBr(dateStr);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const optionalBrDateSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || isValidDateBr(value), {
    message: 'Data invalida. Use o formato DD/MM/AAAA',
  });

export const trf5BaseSearchSchema = z.object({
  termo_busca: z
    .string()
    .trim()
    .max(120, 'Use no maximo 120 caracteres')
    .optional()
    .default(''),
  data_julgamento_inicio: optionalBrDateSchema,
  data_julgamento_fim: optionalBrDateSchema,
}).refine(data => {
  if (data.data_julgamento_inicio && data.data_julgamento_fim) {
    const inicio = parseDateBr(data.data_julgamento_inicio);
    const fim = parseDateBr(data.data_julgamento_fim);
    return fim >= inicio;
  }
  return true;
}, {
  message: 'A data de fim deve ser maior ou igual a data de inicio',
  path: ['data_julgamento_fim'],
});

export const trf5SearchSchema = z.object({
  orgao: z.literal('TRU'),
  uf: z.literal('CE'),
  termo_busca: z
    .string()
    .trim()
    .min(3, 'Informe pelo menos um termo com 3 caracteres')
    .max(120, 'Use no maximo 120 caracteres')
    .refine((value) => {
      const terms = value.split(TERM_SEPARATOR_REGEX).map((term) => term.trim()).filter(Boolean);
      return terms.every((term) => term.length >= 3);
    }, 'Cada termo deve ter pelo menos 3 caracteres'),
  data_julgamento_inicio: optionalBrDateSchema,
  data_julgamento_fim: optionalBrDateSchema,
  maxPagesPerTerm: z.coerce
    .number({
      invalid_type_error: 'Informe um numero de paginas valido',
    })
    .int('Informe um numero inteiro de paginas')
    .min(1, 'Informe pelo menos 1 pagina por termo')
    .max(MAX_TRF5_PAGES_PER_TERM, `Limite maximo: ${MAX_TRF5_PAGES_PER_TERM} paginas por termo`)
    .default(5),
}).refine(data => {
  if (data.data_julgamento_inicio && data.data_julgamento_fim) {
    const inicio = parseDateBr(data.data_julgamento_inicio);
    const fim = parseDateBr(data.data_julgamento_fim);
    return fim >= inicio;
  }
  return true;
}, {
  message: 'A data de fim deve ser maior ou igual a data de inicio',
  path: ['data_julgamento_fim'],
});

export type TRF5SearchFormValues = z.infer<typeof trf5SearchSchema>;
export type TRF5BaseSearchFormValues = z.infer<typeof trf5BaseSearchSchema>;
