import { z } from 'zod';

/**
 * Transforma string vazia em null — evita enviar "" para colunas
 * que esperam tipos estritos (date, uuid) no PostgREST.
 */
const emptyToNull = z
  .string()
  .nullable()
  .optional()
  .transform((val) => (val === '' ? null : val));

/**
 * Schema de validação para criação/edição de perícia.
 * Garante que client_id seja um UUID válido e que campos de data
 * opcionais sejam null (não string vazia) quando não preenchidos.
 */
export const novaPericiaSchema = z.object({
  // Obrigatório — UUID válido
  client_id: z
    .string({ required_error: 'Selecione um cliente' })
    .uuid({ message: 'Cliente inválido. Selecione um cliente da lista.' }),

  // Campos de texto opcionais
  senha_inss: emptyToNull,
  esfera: z
    .enum(['Administrativa', 'Judicial'], {
      required_error: 'Selecione a esfera',
      invalid_type_error: 'Esfera inválida',
    })
    .default('Administrativa'),

  status: z
    .enum(
      [
        'Benefício Ativo',
        'Perícia Agendada',
        'Documentos Pendentes',
        'Benefício Cessado',
        'Benefício Negado',
      ],
      {
        required_error: 'Selecione o status',
        invalid_type_error: 'Status inválido',
      },
    )
    .default('Benefício Ativo'),

  documentos_pendentes: emptyToNull,

  // Datas opcionais — string vazia vira null
  dib: emptyToNull,
  dcb: emptyToNull,
  data_pericia: emptyToNull,

  // Hora é string comum (HH:mm) — opcional
  horario_pericia: emptyToNull,
  local_pericia: emptyToNull,
  observacoes: emptyToNull,

  // Flags internas
  alerta_dcb_exibido: z.boolean().default(false),
  alertas_pericia_exibidos: z.array(z.number()).default([]),

  // Campos denormalizados (copiados do cliente)
  nome: emptyToNull,
  cpf: emptyToNull,
});

export const novaPericiaSchemaPartial = novaPericiaSchema.partial();
