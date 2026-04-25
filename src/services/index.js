import { BaseService } from "./baseService";
export { authService } from "./authService";

// Client Service especializado com validação Zod
export { clientService } from "./clientService";
export const processService = new BaseService("processes");
// DeadlineService especializado com fluxo HITL e Motor Híbrido IA
export { deadlineService } from "./deadlineService";
export const taskService = new BaseService("tasks");
export const financialService = new BaseService("financials");
export const documentService = new BaseService("documents");
export const appointmentService = new BaseService("appointments");
export const notificationService = new BaseService("notifications");
export const templateService = new BaseService("templates");
export const documentTemplateService = new BaseService("document_templates");
export const userService = new BaseService("users");
export const inssEmailService = new BaseService("client_inss_emails");
export const holidayService = new BaseService("holidays");
export { atendimentoService } from "./atendimentoService";

// Specialized Entities
export const beneficioService = new BaseService("beneficios");
export const beneficioAposentadoriaRuralService = new BaseService("beneficios_aposentadoria_rural");
export const beneficioBPC_IdosoService = new BaseService("beneficios_bpc_idoso");
export const beneficioIncapacidadeRuralService = new BaseService("beneficios_incapacidade_rural");
export const beneficioSalarioMaternidadeRuralService = new BaseService("beneficios_salario_maternidade_rural");

// Document and Process related
export const documentFolderService = new BaseService("document_folders");
export const documentVersionService = new BaseService("document_versions");
export const processMoveService = new BaseService("process_moves");

// AI Service - FASE B
export { aiService } from './aiService';

// Calendar Service - Google Calendar Integration
export { calendarService } from './calendarService';

// CNJ Service - DataJud + DJEN Government APIs
export { cnjService } from './cnjService';
