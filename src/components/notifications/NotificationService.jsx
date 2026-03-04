import { authService } from "@/services/authService";
import { notificationService } from "@/services";
/**
 * Serviço centralizado para criar notificações no sistema
 */

/**
 * Cria notificação para prazo processual próximo
 */
export const createDeadlineNotification = async (deadline, daysUntil) => {
  const priority =
    daysUntil <= 2 ? "urgente" : daysUntil <= 7 ? "importante" : "informativa";

  const currentUser = await authService.getCurrentUser();
  const targetEmail = deadline.responsible_email || currentUser?.email;
  if (!targetEmail) return;
  const targetUserId = await authService.getUserIdByEmail(targetEmail);
  if (!targetUserId) return;

  await notificationService.create({
    user_id: targetUserId,
    type: "prazo",
    priority: priority,
    title:
      daysUntil <= 0
        ? "Prazo Vencendo HOJE"
        : `Prazo vence em ${daysUntil} dia(s)`,
    message: `${deadline.description} - Processo: ${deadline.process_number}`,
    link: `/process-detail?id=${deadline.process_id}`,
    related_id: deadline.id,
  });
};

/**
 * Cria notificação para tarefa atribuída
 */
export const createTaskAssignedNotification = async (task) => {
  if (!task.assigned_to) return;
  const targetUserId = await authService.getUserIdByEmail(task.assigned_to);
  if (!targetUserId) return;

  await notificationService.create({
    user_id: targetUserId,
    type: "tarefa",
    priority: task.priority === "urgente" ? "urgente" : "importante",
    title: "Nova Tarefa Atribuída",
    message: `${task.title}${task.client_name ? ` - Cliente: ${task.client_name}` : ""}`,
    link: `/tasks`,
    related_id: task.id,
  });
};

/**
 * Cria notificação para tarefa próxima do vencimento
 */
export const createTaskDueNotification = async (task, daysUntil) => {
  if (!task.assigned_to || !task.due_date) return;
  const targetUserId = await authService.getUserIdByEmail(task.assigned_to);
  if (!targetUserId) return;

  const priority =
    daysUntil <= 0 ? "urgente" : daysUntil === 0 ? "importante" : "informativa";

  await notificationService.create({
    user_id: targetUserId,
    type: "tarefa",
    priority: priority,
    title:
      daysUntil <= 0
        ? "Tarefa Atrasada"
        : daysUntil === 0
          ? "Tarefa Vence Hoje"
          : `Tarefa vence em ${daysUntil} dia(s)`,
    message: `${task.title}${task.client_name ? ` - Cliente: ${task.client_name}` : ""}`,
    link: `/tasks`,
    related_id: task.id,
  });
};

/**
 * Cria notificação para agendamento próximo
 */
export const createAppointmentNotification = async (appointment, daysUntil) => {
  const user = await authService.getCurrentUser();
  if (!user?.id) return;
  const priority = daysUntil === 0 ? "importante" : "informativa";

  await notificationService.create({
    user_id: user.id,
    type: "compromisso",
    priority: priority,
    title:
      daysUntil === 0
        ? "Agendamento Hoje"
        : `Agendamento em ${daysUntil} dia(s)`,
    message: `${appointment.title} - ${appointment.client_name}`,
    link: `/client-detail?id=${appointment.client_id}`,
    related_id: appointment.id,
  });
};

/**
 * Cria notificação para nova movimentação processual
 */
export const createProcessMoveNotification = async (move) => {
  const user = await authService.getCurrentUser();
  if (!user?.id) return;

  const priority =
    move.move_type === "sentenca"
      ? "urgente"
      : move.move_type === "intimacao"
        ? "importante"
        : "informativa";

  await notificationService.create({
    user_id: user.id,
    type: "movimentacao",
    priority: priority,
    title: `Nova Movimentação: ${move.move_type}`,
    message: `${move.description.substring(0, 100)}...`,
    link: `/process-detail?id=${move.process_id}`,
    related_id: move.id,
  });
};

/**
 * Cria notificação para documento anexado
 */
export const createDocumentNotification = async (
  document,
  actionType = "upload",
) => {
  const user = await authService.getCurrentUser();
  if (!user?.id) return;

  const title =
    actionType === "upload"
      ? "Novo Documento Anexado"
      : actionType === "approved"
        ? "Documento Aprovado"
        : actionType === "rejected"
          ? "Documento Rejeitado"
          : "Atualização de Documento";

  const priority =
    actionType === "rejected"
      ? "importante"
      : actionType === "urgent"
        ? "urgente"
        : "informativa";

  await notificationService.create({
    user_id: user.id,
    type: "documento",
    priority: priority,
    title: title,
    message: `${document.name}${document.category ? ` - ${document.category}` : ""}`,
    link:
      document.parent_type === "client"
        ? `/client-detail?id=${document.parent_id}`
        : `/process-detail?id=${document.parent_id}`,
    related_id: document.id,
  });
};

/**
 * Cria notificação para novo cliente cadastrado
 */
export const createNewClientNotification = async (client) => {
  const user = await authService.getCurrentUser();
  if (!user?.id) return;

  await notificationService.create({
    user_id: user.id,
    type: "sistema",
    priority: "informativa",
    title: "Novo Cliente Cadastrado",
    message: `${client.full_name} - ${client.cpf_cnpj}`,
    link: `/client-detail?id=${client.id}`,
    related_id: client.id,
  });
};

/**
 * Cria notificação para benefício atualizado
 */
export const createBeneficioNotification = async (beneficio, status) => {
  const user = await authService.getCurrentUser();
  if (!user?.id) return;

  const priority =
    status === "deferido"
      ? "sucesso"
      : status === "indeferido"
        ? "importante"
        : status === "protocolado"
          ? "informativa"
          : "informativa";

  const title =
    status === "deferido"
      ? "✅ Benefício Deferido"
      : status === "indeferido"
        ? "❌ Benefício Indeferido"
        : status === "protocolado"
          ? "📝 Benefício Protocolado"
          : "Benefício Atualizado";

  await notificationService.create({
    user_id: user.id,
    type: "sistema",
    priority: priority,
    title: title,
    message: `${beneficio.tipo_beneficio} - ${beneficio.client_name}`,
    link: `/client-detail?id=${beneficio.client_id}`,
    related_id: beneficio.id,
  });
};

/**
 * Limpa notificações antigas (executar periodicamente)
 */
export const cleanOldNotifications = async (daysOld = 30) => {
  const user = await authService.getCurrentUser();
  if (!user?.id) return;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Instead of passing a complex object for created_at, fetch all and filter client-side
  const allNotifications = await notificationService.filter({
    user_id: user.id,
    is_read: true,
  });
  
  const oldNotifications = allNotifications.filter(n => new Date(n.created_at) < cutoffDate);

  for (const notification of oldNotifications) {
    await notificationService.delete(notification.id);
  }
};
