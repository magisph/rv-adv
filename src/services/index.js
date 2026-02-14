import { BaseService } from "./baseService";
export { authService } from "./authService";

// Entity Services mapped to probable table names
export const clientService = new BaseService("clients");
export const processService = new BaseService("processes");
export const deadlineService = new BaseService("deadlines");
export const taskService = new BaseService("tasks");
export const financialService = new BaseService("financials");
export const documentService = new BaseService("documents");
export const appointmentService = new BaseService("appointments");
export const notificationService = new BaseService("notifications");
export const templateService = new BaseService("templates");
export const userService = new BaseService("users");

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
