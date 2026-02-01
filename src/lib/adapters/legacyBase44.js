import { authService } from "@/services/authService";
import * as services from "@/services";

export const base44 = {
  auth: {
    me: () => authService.getCurrentUser(),
    logout: (redirectUrl) => {
        authService.logout();
        if (redirectUrl) window.location.href = redirectUrl;
    },
    redirectToLogin: () => window.location.href = '/login',
    login: (creds) => authService.login(creds)
  },
  entities: {
    Client: services.clientService,
    Process: services.processService,
    Deadline: services.deadlineService,
    Task: services.taskService,
    Financial: services.financialService,
    Document: services.documentService,
    Appointment: services.appointmentService,
    Notification: services.notificationService,
    Template: services.templateService,
    
    Beneficio: services.beneficioService,
    BeneficioAposentadoriaRural: services.beneficioAposentadoriaRuralService,
    BeneficioBPC_Idoso: services.beneficioBPC_IdosoService,
    BeneficioIncapacidadeRural: services.beneficioIncapacidadeRuralService,
    BeneficioSalarioMaternidadeRural: services.beneficioSalarioMaternidadeRuralService,
    
    DocumentFolder: services.documentFolderService,
    DocumentVersion: services.documentVersionService,
    ProcessMove: services.processMoveService,
  }
};
