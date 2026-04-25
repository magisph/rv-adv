import { z } from "zod";

export const processSchema = z.object({
  process_number: z.string().min(1, "Número do processo é obrigatório"),
  client_id: z.string().uuid("ID de cliente inválido"),
  client_name: z.string().min(1, "Nome do cliente é obrigatório"),
  court: z.string().optional().transform(v => v === "" ? null : v),
  subject: z.string().optional().transform(v => v === "" ? null : v),
  area: z.string().min(1, "Área é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  distribution_date: z.string().optional().transform(v => v === "" ? null : v),
  last_move_date: z.string().optional().transform(v => v === "" ? null : v),
  case_value: z.coerce.number().optional().default(0),
});
