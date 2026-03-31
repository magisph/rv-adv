// KanbanCard Component
// Cartão individual de tarefa no Kanban - memoizado para performance

import React, { memo, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PRIORITY_CONFIG, KANBAN_COLUMNS } from "./constants";

// Função utilitária para status temporal (memoizada externamente)
export const getTemporalStatus = (dueDate) => {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      type: "overdue",
      label: `Atrasada ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? "s" : ""}`,
      color: "bg-red-100 text-red-700 border-red-200",
      bgColor: "bg-red-50",
      priority: 0,
    };
  } else if (diffDays === 0) {
    return {
      type: "today",
      label: "Vence hoje",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      bgColor: "bg-orange-50",
      priority: 1,
    };
  } else if (diffDays <= 3) {
    return {
      type: "soon",
      label: `Vence em ${diffDays} dia${diffDays !== 1 ? "s" : ""}`,
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      bgColor: "",
      priority: 2,
    };
  } else {
    return {
      type: "ok",
      label: `Vence em ${diffDays} dias`,
      color: "bg-slate-100 text-slate-600 border-slate-200",
      bgColor: "",
      priority: 3,
    };
  }
};

// Função para gerar cor do avatar
export const getAvatarColor = (email) => {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Função para pegar iniciais do nome
export const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const KanbanCard = memo(({
  task,
  columnId,
  user,
  allUsers,
  isCollaborativeMode,
  isAdmin,
  isRestricted,
  selectedTasks,
  isSelectionMode,
  onEdit,
  onMoveTask,
  onChangePriority,
  onDuplicateTask,
  onReassignTask,
  onToggleSelection,
  onLongPress,
}) => {
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
  const temporalStatus = getTemporalStatus(task.due_date);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const PriorityIcon = priorityConfig.icon;

  const canEditPriority = isAdmin;
  const isCritical = task.priority === "urgente";
  const isOverdue = temporalStatus?.type === "overdue";
  const isToday = temporalStatus?.type === "today";

  // Handlers memoizados
  const handleClick = useCallback(() => {
    if (!isSelectionMode && onEdit) onEdit(task);
  }, [isSelectionMode, onEdit, task]);

  const handleCheckboxChange = useCallback(() => {
    if (onToggleSelection) onToggleSelection(task.id);
  }, [onToggleSelection, task.id]);

  const handlePriorityChange = useCallback((key) => {
    if (onChangePriority) onChangePriority(task, key);
  }, [onChangePriority, task]);

  const handleMove = useCallback((colId) => {
    if (onMoveTask) onMoveTask(task, colId);
  }, [onMoveTask, task]);

  const handleDuplicate = useCallback(() => {
    if (onDuplicateTask) onDuplicateTask(task);
  }, [onDuplicateTask, task]);

  // Teletransporte - navegação de status
  const ORDER = ["todo", "in_progress", "in_review", "done"];
  const currentCol = task.kanban_column || (task.status === "done" ? "done" : "todo");
  const idx = ORDER.indexOf(currentCol);
  const prevCol = idx > 0 ? ORDER[idx - 1] : null;
  const nextCol = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
  const LABELS = { todo: "A Fazer", in_progress: "Em Progresso", in_review: "Em Revisão", done: "Concluído" };
  const nextDisabled = !nextCol || (isRestricted && nextCol === "done");

  return (
    <motion.div
      layout
      layoutId={String(task.id)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`rounded-lg border-l-4 border p-3 mb-2 shadow-sm hover:shadow-md transition-all group relative cursor-pointer ${isCritical ? "animate-pulse-border" : ""} ${
        isOverdue ? "bg-red-50" : isToday ? "bg-orange-50" : "bg-white"
      } ${selectedTasks.has(task.id) ? "ring-2 ring-blue-500" : ""}`}
      style={{ borderLeftColor: priorityConfig.borderColor }}
    >
      <div className="flex items-start gap-2">
        {isSelectionMode && (
          <input
            type="checkbox"
            checked={selectedTasks.has(task.id)}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Priority Badge */}
            {canEditPriority ? (
              <DropdownMenu open={showPriorityMenu} onOpenChange={setShowPriorityMenu}>
                <DropdownMenuTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`${priorityConfig.color} text-xs cursor-pointer hover:opacity-80 transition-opacity`}
                    style={{ minWidth: "65px", minHeight: "20px" }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <PriorityIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                    {priorityConfig.label}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <DropdownMenuItem key={key} onClick={() => handlePriorityChange(key)} className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: config.borderColor }} aria-hidden="true" />
                        {config.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge
                variant="outline"
                className={`${priorityConfig.color} text-xs`}
                style={{ minWidth: "65px", minHeight: "20px" }}
              >
                <PriorityIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                {priorityConfig.label}
              </Badge>
            )}

            {/* Temporal Status Badge */}
            {temporalStatus && (isOverdue || isToday) && (
              <Badge variant="outline" className={`${temporalStatus.color} text-xs font-medium`}>
                {isOverdue && <AlertCircle className="w-3 h-3 mr-1" aria-hidden="true" />}
                {temporalStatus.label}
              </Badge>
            )}
          </div>

          {/* Task Title */}
          <h4 className="font-medium text-slate-800 text-sm mb-1 break-words">{task.title}</h4>

          {/* Client Name */}
          {task.client_name && (
            <p className="text-xs text-slate-600 truncate mb-1">{task.client_name}</p>
          )}

          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-600 mb-1 break-words line-clamp-2">{task.description}</p>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <span className={temporalStatus
                ? isOverdue
                  ? "text-red-700 font-medium"
                  : isToday
                    ? "text-orange-700 font-medium"
                    : "text-slate-600"
                : "text-slate-600"
              }>
                {format(new Date(task.due_date), "dd/MM/yy", { locale: ptBR })}
              </span>
              {temporalStatus && !isOverdue && !isToday && (
                <span className="text-slate-400">• {temporalStatus.label}</span>
              )}
            </div>
          )}

          {/* Avatar do Responsável */}
          {isCollaborativeMode && task.assigned_name && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: getAvatarColor(task.assigned_to) }}
                aria-label={`Avatar de ${task.assigned_name}`}
              >
                {getInitials(task.assigned_name)}
              </div>
              <span className="text-xs text-slate-600 truncate">{task.assigned_name}</span>
            </div>
          )}

          {/* Teletransporte - Navigation Arrows */}
          <div
            className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={!prevCol}
              onClick={(e) => { e.stopPropagation(); if (prevCol) handleMove(prevCol); }}
              className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors px-1"
            >
              <ChevronLeft className="w-3 h-3" aria-hidden="true" />
              {prevCol ? LABELS[prevCol] : null}
            </button>
            <button
              type="button"
              disabled={nextDisabled}
              onClick={(e) => { e.stopPropagation(); if (!nextDisabled && nextCol) handleMove(nextCol); }}
              className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors px-1"
              title={isRestricted && nextCol === "done" ? "Apenas admin pode concluir" : undefined}
            >
              {nextCol ? LABELS[nextCol] : null}
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Menu de Ações */}
        <DropdownMenu
          open={longPressTask?.id === task.id}
          onOpenChange={(open) => !open && onLongPress && onLongPress(null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 md:opacity-0 md:group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onLongPress && onLongPress(task); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Menu de opções da tarefa"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.values(KANBAN_COLUMNS)
              .filter((col) => col.id !== columnId)
              .map((col) => (
                <DropdownMenuItem key={col.id} onClick={() => handleMove(col.id)}>
                  Mover para {col.title}
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem onClick={handleDuplicate}>
              Duplicar Tarefa
            </DropdownMenuItem>
            {isAdmin && isCollaborativeMode && (
              <>
                <DropdownMenuItem disabled className="font-semibold">
                  Alterar Responsável
                </DropdownMenuItem>
                {allUsers.map((u) => (
                  <DropdownMenuItem
                    key={u.email}
                    onClick={() => onReassignTask && onReassignTask(task, u.email)}
                    disabled={u.email === task.assigned_to}
                  >
                    {u.full_name || u.email}
                    {u.email === task.assigned_to && " (atual)"}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
});

KanbanCard.displayName = "KanbanCard";

export default KanbanCard;
