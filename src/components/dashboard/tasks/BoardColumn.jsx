// BoardColumn Component
// Coluna individual do Kanban com suas tarefas

import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence } from "framer-motion";
import KanbanCard from "./KanbanCard";

const BoardColumn = memo(({
  column,
  tasks,
  user,
  allUsers,
  isCollaborativeMode,
  isAdmin,
  isRestricted,
  selectedTasks,
  isSelectionMode,
  onEditTask,
  onMoveTask,
  onChangePriority,
  onDuplicateTask,
  onReassignTask,
  onToggleSelection,
  onLongPress,
}) => {
  return (
    <div
      className="flex-shrink-0 w-64 bg-slate-50 rounded-lg p-3"
      style={{ minWidth: "16rem" }}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between mb-3 pb-2 border-b-2"
        style={{ borderColor: column.color }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-sm text-slate-700">
            {column.title}
          </h3>
        </div>
        <Badge
          variant="secondary"
          className="text-xs"
          style={{
            backgroundColor: column.bgColor,
            color: column.color,
          }}
        >
          {tasks.length}
        </Badge>
      </div>

      {/* Tasks List */}
      <div className="min-h-[200px] flex flex-col gap-3 justify-start">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              columnId={column.id}
              user={user}
              allUsers={allUsers}
              isCollaborativeMode={isCollaborativeMode}
              isAdmin={isAdmin}
              isRestricted={isRestricted}
              selectedTasks={selectedTasks}
              isSelectionMode={isSelectionMode}
              onEdit={onEditTask}
              onMoveTask={onMoveTask}
              onChangePriority={onChangePriority}
              onDuplicateTask={onDuplicateTask}
              onReassignTask={onReassignTask}
              onToggleSelection={onToggleSelection}
              onLongPress={onLongPress}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

BoardColumn.displayName = "BoardColumn";

export default BoardColumn;
