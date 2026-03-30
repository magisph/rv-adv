// FiltersPanel Component
// Painel de filtros e controles do Kanban

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_CONFIG, PERIOD_FILTERS } from "./constants";

const FiltersPanel = memo(({
  showFilters,
  setShowFilters,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  priorityFilters,
  setPriorityFilters,
  periodFilters,
  setPeriodFilters,
  userFilters,
  setUserFilters,
  allUsers,
  isAdmin,
  isCollaborativeMode,
  isLoading,
  refetch,
  canCreateTasks,
  onTogglePriorityFilter,
  onTogglePeriodFilter,
  onToggleUserFilter,
  onClearFilters,
  getActiveFiltersCount,
  filteredTaskCount,
  totalTasks,
  isSelectionMode,
  setIsSelectionMode,
  selectedTasks,
  handleBulkMove,
  handleBulkPriority,
  handleBulkAssign,
  onShowQuickCreate,
  setSelectedTasks,
}) => {
  const activeFiltersCount = getActiveFiltersCount();

  return (
    <>
      {/* Search */}
      <div className="mb-3">
        <Input
          placeholder="🔍 Buscar tarefas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
          aria-label="Buscar tarefas"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="space-y-2 p-3 bg-slate-50 rounded-lg mb-3">
          {/* Sort Options */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-600">Ordenar por:</span>
            <Button
              variant={sortBy === "priority" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("priority")}
              className="text-xs"
            >
              Prioridade
            </Button>
            <Button
              variant={sortBy === "due_date" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("due_date")}
              className="text-xs"
            >
              Prazo
            </Button>

            {/* Admin View Toggle */}
            {isAdmin && isCollaborativeMode && (
              <>
                <span className="text-xs text-slate-400 mx-2">|</span>
                <Button
                  variant={viewMode === "my" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("my")}
                  className="text-xs"
                >
                  Minhas Tarefas
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                  className="text-xs"
                >
                  Todas as Tarefas
                </Button>
              </>
            )}
          </div>

          {/* User Filters (Admin only) */}
          {isAdmin && isCollaborativeMode && viewMode === "all" && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-600">Filtrar por usuário:</span>
              {allUsers.map((u) => (
                <Button
                  key={u.email}
                  variant={userFilters[u.email] ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleUserFilter(u.email)}
                  className="text-xs"
                >
                  <div
                    className="w-4 h-4 rounded-full mr-1 flex items-center justify-center text-[10px] font-medium text-white"
                    style={{ backgroundColor: getAvatarColor(u.email) }}
                  >
                    {getInitials(u.full_name || u.email)}
                  </div>
                  {u.full_name || u.email}
                </Button>
              ))}
            </div>
          )}

          {/* Period Filters */}
          <div className="flex flex-wrap gap-2">
            {PERIOD_FILTERS.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={periodFilters[key] ? "default" : "outline"}
                size="sm"
                onClick={() => onTogglePeriodFilter(key)}
                className={`text-xs ${periodFilters[key] ? "bg-legal-blue" : ""}`}
              >
                <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>

          {/* Priority Filters */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = priorityFilters[key];
              return (
                <Button
                  key={key}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onTogglePriorityFilter(key)}
                  className={`text-xs ${isActive ? "" : "opacity-50"}`}
                  style={
                    isActive
                      ? { backgroundColor: config.borderColor, borderColor: config.borderColor }
                      : {}
                  }
                >
                  <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
                  {config.label}
                </Button>
              );
            })}
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onClearFilters} className="text-xs">
                Limpar Todos os Filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {searchQuery && (
            <Badge variant="secondary" className="text-xs">
              Busca: &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery("")} className="ml-2 hover:text-red-600" aria-label="Remover filtro de busca">
                ×
              </button>
            </Badge>
          )}
          {Object.entries(periodFilters)
            .filter(([_, active]) => active)
            .map(([key]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key === "hoje" && "Hoje"}
                {key === "esta_semana" && "Esta Semana"}
                {key === "este_mes" && "Este Mês"}
                {key === "vencidas" && "Vencidas"}
                {key === "sem_prazo" && "Sem Prazo"}
                <button onClick={() => onTogglePeriodFilter(key)} className="ml-2 hover:text-red-600" aria-label={`Remover filtro ${key}`}>
                  ×
                </button>
              </Badge>
            ))}
          {Object.entries(priorityFilters)
            .filter(([_, active]) => !active)
            .map(([key]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                Sem: {PRIORITY_CONFIG[key]?.label}
                <button onClick={() => onTogglePriorityFilter(key)} className="ml-2 hover:text-red-600" aria-label={`Ativar prioridade ${key}`}>
                  ×
                </button>
              </Badge>
            ))}
        </div>
      )}
    </>
  );
});

FiltersPanel.displayName = "FiltersPanel";

// Helper functions
const getAvatarColor = (email) => {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default FiltersPanel;
