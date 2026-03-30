import { z } from "zod";

// ============================================
// Security Validation Consts (Defense-in-depth)
// ============================================
export const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ============================================
// Core Form Zod Security Schemas
// ============================================
export const securitySchemas = {
  // Autenticação Segura (Limita tamanho de strings contra DoS em Regex)
  auth: z.object({
    email: z.string().email("Formato de e-mail inválido").max(100),
    password: z.string().min(8, "Mínimo 8 caracteres").max(100),
  }),

  // Formulário Genérico Protegido contra injection e arrays excessivos
  safeId: z.string().uuid("Formato de ID inválido"),
  
  // Exemplo de Sanitização de Upload de Documentos
  documentUpload: z.object({
    fileSize: z
      .number()
      .max(MAX_UPLOAD_SIZE, `Arquivo muito grande. Max ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`),
    mimeType: z
      .string()
      .refine((val) => ALLOWED_MIME_TYPES.includes(val), {
        message: "Tipo de arquivo não permitido",
      }),
    fileName: z.string().max(255).regex(/^[\w\-. ]+$/, "Nome do arquivo possui caracteres inválidos"),
  }),
};
