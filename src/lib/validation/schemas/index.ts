/**
 * Hub Central de Schemas Zod
 * Centraliza todas as validações de domínio do projeto RV-Adv
 * 
 * @module validation/schemas
 */
import { z } from "zod";

// Re-exporta schemas de segurança existentes
export { 
  MAX_PAYLOAD_SIZE, 
  MAX_UPLOAD_SIZE, 
  ALLOWED_MIME_TYPES, 
  securitySchemas 
} from '../security-schemas.js';

// ============================================
// Client Schemas
// ============================================

/**
 * Validação matemática de CPF (dígitos verificadores).
 * Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11).
 */
function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  const digito1 = resto >= 10 ? 0 : resto;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;

  return parseInt(cpf.charAt(9)) === digito1 && parseInt(cpf.charAt(10)) === digito2;
}

/**
 * Validação matemática de CNPJ (dígitos verificadores).
 * Rejeita CNPJs com todos os dígitos iguais (ex: 11.111.111/1111-11).
 */
function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

/**
 * Schema para validação de CPF/CNPJ com verificação matemática dos dígitos.
 */
const cpfCnpjSchema = z.string()
  .min(11, "CPF/CNPJ deve ter no mínimo 11 caracteres")
  .max(18, "CPF/CNPJ deve ter no máximo 18 caracteres")
  .regex(/^[\d.\-/]+$/, "CPF/CNPJ contém caracteres inválidos")
  .refine((val) => {
    const clean = val.replace(/[^\d]/g, "");
    if (clean.length === 11) return validarCPF(clean);
    if (clean.length === 14) return validarCNPJ(clean);
    return false;
  }, "CPF ou CNPJ inválido");

/**
 * Schema para área de atuação jurídica
 */
export const AREAS_ATUACAO = {
  PREVIDENCIARIO: "Previdenciário",
  CIVEL: "Cível",
} as const;

/**
 * Lista de áreas de atuação
 */
export const AREAS_LIST = Object.values(AREAS_ATUACAO);

/**
 * Schema para criação de cliente
 */
export const clientCreateSchema = z.object({
  nome: z.string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  cpf_cnpj: cpfCnpjSchema,
  email: z.string().email("Formato de e-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  area_atuacao: z.enum([
    AREAS_ATUACAO.PREVIDENCIARIO, 
    AREAS_ATUACAO.CIVEL
  ]).optional(),
  endereco: z.object({
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cep: z.string().optional(),
  }).optional(),
  observacoes: z.string().max(2000).optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});

/**
 * Schema para atualização de cliente
 */
export const clientUpdateSchema = clientCreateSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

/**
 * Schema para validação de resposta de cliente
 */
export const clientResponseSchema = clientCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

// ============================================
// Appointment Schemas
// ============================================

/**
 * Status de compromisso
 */
export const APPOINTMENT_STATUS = {
  AGENDADO: "agendado",
  REALIZADO: "realizado",
  CANCELADO: "cancelado",
} as const;

/**
 * Schema para criação de compromisso
 */
export const appointmentCreateSchema = z.object({
  client_id: z.string().uuid("ID de cliente inválido"),
  client_name: z.string().optional(),
  title: z.string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  date: z.string().datetime({ message: "Data inválida" }),
  notes: z.string().max(2000).optional(),
  status: z.enum([
    APPOINTMENT_STATUS.AGENDADO,
    APPOINTMENT_STATUS.REALIZADO,
    APPOINTMENT_STATUS.CANCELADO,
  ]).default(APPOINTMENT_STATUS.AGENDADO),
  location: z.string().max(500).optional(),
  alerts_enabled: z.boolean().default(false),
  alert_days: z.array(z.number().int().min(0).max(30)).default([]),
});

/**
 * Schema para atualização de compromisso
 */
export const appointmentUpdateSchema = appointmentCreateSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

/**
 * Schema para validação de resposta de compromisso
 */
export const appointmentResponseSchema = appointmentCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

// ============================================
// Process Schemas
// ============================================

/**
 * Tipo de processo
 */
export const PROCESS_TYPES = {
  PREVIDENCIARIO: "previdenciario",
  CIVEL: "civel",
  TRABALHISTA: "trabalhista",
  OUTRO: "outro",
} as const;

/**
 * Status de processo
 */
export const PROCESS_STATUS = {
  ATIVO: "ativo",
  ARQUIVADO: "arquivado",
  JULGADO: "julgado",
} as const;

/**
 * Schema para criação de processo
 */
export const processCreateSchema = z.object({
  client_id: z.string().uuid("ID de cliente inválido"),
  numero: z.string()
    .min(5, "Número do processo deve ter no mínimo 5 caracteres")
    .max(50, "Número do processo deve ter no máximo 50 caracteres"),
  tipo: z.enum([
    PROCESS_TYPES.PREVIDENCIARIO,
    PROCESS_TYPES.CIVEL,
    PROCESS_TYPES.TRABALHISTA,
    PROCESS_TYPES.OUTRO,
  ]),
  status: z.enum([
    PROCESS_STATUS.ATIVO,
    PROCESS_STATUS.ARQUIVADO,
    PROCESS_STATUS.JULGADO,
  ]).default(PROCESS_STATUS.ATIVO),
  titulo: z.string().max(200).optional(),
  descricao: z.string().max(2000).optional(),
  vara: z.string().max(200).optional(),
  instancia: z.number().int().min(1).max(10).optional(),
  data_distribuicao: z.string().datetime().optional(),
  valor_causa: z.number().positive().optional(),
});

/**
 * Schema para atualização de processo
 */
export const processUpdateSchema = processCreateSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

/**
 * Schema para validação de resposta de processo
 */
export const processResponseSchema = processCreateSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

// ============================================
// Deadline Schemas
// ============================================

/**
 * Status de prazo
 */
export const DEADLINE_STATUS = {
  PENDENTE: "pendente",
  CUMPRIDO: "cumprido",
  CANCELADO: "cancelado",
} as const;

/**
 * Schema para criação de prazo
 */
export const deadlineCreateSchema = z.object({
  processo_id: z.string().uuid("ID de processo inválido").optional(),
  titulo: z.string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  descricao: z.string().max(1000).optional(),
  due_date: z.string().datetime({ message: "Data limite inválida" }),
  status: z.enum([
    DEADLINE_STATUS.PENDENTE,
    DEADLINE_STATUS.CUMPRIDO,
    DEADLINE_STATUS.CANCELADO,
  ]).default(DEADLINE_STATUS.PENDENTE),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
});

/**
 * Schema para atualização de prazo
 */
export const deadlineUpdateSchema = deadlineCreateSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

// ============================================
// Task Schemas
// ============================================

/**
 * Status de tarefa
 */
export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

/**
 * Schema para criação de tarefa
 */
export const taskCreateSchema = z.object({
  titulo: z.string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  descricao: z.string().max(2000).optional(),
  status: z.enum([
    TASK_STATUS.TODO,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.DONE,
    TASK_STATUS.CANCELLED,
  ]).default(TASK_STATUS.TODO),
  processo_id: z.string().uuid("ID de processo inválido").optional(),
  responsavel: z.string().max(200).optional(),
  data_prazo: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).default([]),
});

/**
 * Schema para atualização de tarefa
 */
export const taskUpdateSchema = taskCreateSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

// ============================================
// Document Schemas
// ============================================

/**
 * Schema para upload de documento
 */
export const documentUploadSchema = z.object({
  fileName: z.string()
    .min(1, "Nome do arquivo é obrigatório")
    .max(255, "Nome do arquivo muito longo")
    .regex(/^[\w\-. ]+$/, "Nome do arquivo possui caracteres inválidos"),
  fileSize: z.number()
    .max(50 * 1024 * 1024, "Arquivo muito grande. Max 50MB"),
  mimeType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ], { message: "Tipo de arquivo não permitido" }),
  client_id: z.string().uuid("ID de cliente inválido").optional(),
  processo_id: z.string().uuid("ID de processo inválido").optional(),
  categoria: z.string().max(100).optional(),
});

// ============================================
// Type Exports
// ============================================

/**
 * Tipos inferidos dos schemas
 */
export type ClientCreate = z.infer<typeof clientCreateSchema>;
export type ClientUpdate = z.infer<typeof clientUpdateSchema>;
export type ClientResponse = z.infer<typeof clientResponseSchema>;

export type AppointmentCreate = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdate = z.infer<typeof appointmentUpdateSchema>;
export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;

export type ProcessCreate = z.infer<typeof processCreateSchema>;
export type ProcessUpdate = z.infer<typeof processUpdateSchema>;
export type ProcessResponse = z.infer<typeof processResponseSchema>;

export type DeadlineCreate = z.infer<typeof deadlineCreateSchema>;
export type DeadlineUpdate = z.infer<typeof deadlineUpdateSchema>;

export type TaskCreate = z.infer<typeof taskCreateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;

export type DocumentUpload = z.infer<typeof documentUploadSchema>;
