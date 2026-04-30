import { z } from 'zod';

const dateRegex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

const parseDateBr = (dateStr: string) => {
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
};

export const trf5SearchSchema = z.object({
  orgao: z.literal('TRU'),
  uf: z.literal('CE'),
  texto_livre: z.string().min(3, 'O texto de busca deve ter pelo menos 3 caracteres').max(100, 'O texto de busca deve ter no máximo 100 caracteres'),
  data_julgamento_inicio: z.string()
    .regex(dateRegex, 'Data inválida. Use o formato DD/MM/AAAA')
    .optional()
    .or(z.literal('')),
  data_julgamento_fim: z.string()
    .regex(dateRegex, 'Data inválida. Use o formato DD/MM/AAAA')
    .optional()
    .or(z.literal(''))
}).refine(data => {
  if (data.data_julgamento_inicio && data.data_julgamento_fim) {
    const inicio = parseDateBr(data.data_julgamento_inicio);
    const fim = parseDateBr(data.data_julgamento_fim);
    return fim >= inicio;
  }
  return true;
}, {
  message: 'A data de fim deve ser maior ou igual à data de início',
  path: ['data_julgamento_fim']
});

export type TRF5SearchFormValues = z.infer<typeof trf5SearchSchema>;
