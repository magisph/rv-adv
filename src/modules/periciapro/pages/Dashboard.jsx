import React, { useState, useMemo, useCallback } from "react";
import { periciaService } from "@/modules/periciapro/services/periciaService";
import { activityLogService } from "@/modules/periciapro/services/activityLogService";
import { calendarService } from "@/modules/periciapro/services/calendarService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import PericiaTable from "../components/dashboard/PericiaTable";
import PericiaModal from "../components/dashboard/PericiaModal";
import StatsOverview from "../components/dashboard/StatsOverview";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPericia, setEditingPericia] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [esferaFilter, setEsferaFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: pericias = [], isLoading } = useQuery({
    queryKey: ["pericias"],
    queryFn: () => periciaService.list({ orderBy: 'updated_at', ascending: false }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const novaPericia = await periciaService.create(data);
      // BUG #1 fix: log failure must not mask the successful pericia creation
      try {
        await activityLogService.create({
          pericia_id: novaPericia.id,
          type: "creation",
          description: `Perícia criada: ${novaPericia.nome}`,
        });
      } catch (logError) {
        console.warn("[Dashboard] Log de criação falhou (não crítico):", logError);
      }

      // Sincronizar com Google Calendar automaticamente
      if (
        novaPericia.data_pericia &&
        novaPericia.status === "Perícia Agendada"
      ) {
        try {
          await calendarService.syncToGoogleCalendar(novaPericia.id);
        } catch {
          // Sync com Google Calendar é opcional — falha não bloqueia a operação
        }
      }

      return novaPericia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pericias"] });
      setIsModalOpen(false);
      setEditingPericia(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const atualizada = await periciaService.update(id, data);
      // BUG #1 fix: log failure must not mask the successful pericia update
      try {
        await activityLogService.create({
          pericia_id: id,
          type: "update",
          description: "Dados da perícia atualizados via dashboard",
        });
      } catch (logError) {
        console.warn("[Dashboard] Log de atualização falhou (não crítico):", logError);
      }

      // Sincronizar com Google Calendar automaticamente
      if (atualizada.data_pericia && atualizada.status === "Perícia Agendada") {
        try {
          await calendarService.syncToGoogleCalendar(id);
        } catch {
          // Sync com Google Calendar é opcional — falha não bloqueia a operação
        }
      }

      return atualizada;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pericias"] });
      setIsModalOpen(false);
      setEditingPericia(null);
    },
  });

  const markSeenMutation = useMutation({
    mutationFn: async (pericia) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const updates = {};

      // Marcar DCB
      if (pericia.dcb) {
        const dcbDate = new Date(pericia.dcb + "T00:00:00");
        const diffDays = Math.ceil((dcbDate - hoje) / (1000 * 60 * 60 * 24));
        if (diffDays <= 15 && diffDays >= 0) {
          updates.alerta_dcb_exibido = true;
        }
      }

      // Marcar Perícia
      if (pericia.data_pericia && pericia.status === "Perícia Agendada") {
        const periciaDate = new Date(pericia.data_pericia + "T00:00:00");
        const diffDays = Math.ceil(
          (periciaDate - hoje) / (1000 * 60 * 60 * 24),
        );

        const diasAlertas = [60, 45, 30, 15, 7, 3, 1]; // Lista estendida
        const novosAlertasExibidos = [
          ...(pericia.alertas_pericia_exibidos || []),
        ];

        diasAlertas.forEach((dias) => {
          if (
            diffDays <= dias &&
            diffDays >= 0 &&
            !novosAlertasExibidos.includes(dias)
          ) {
            novosAlertasExibidos.push(dias);
          }
        });

        updates.alertas_pericia_exibidos = novosAlertasExibidos;
      }

      if (Object.keys(updates).length > 0) {
        await periciaService.update(pericia.id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pericias"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Buscar perícia para obter event_id antes de deletar
      const periciaParaDeletar = pericias.find((p) => p.id === id);

      // Deletar do banco
      await periciaService.delete(id);

      // Remover do Google Calendar se sincronizado
      if (periciaParaDeletar?.google_calendar_event_id) {
        try {
          await calendarService.deleteFromGoogleCalendar(
            periciaParaDeletar.google_calendar_event_id
          );
        } catch {
          // Remoção do Calendar é opcional — falha não bloqueia a exclusão da perícia
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pericias"] });
    },
  });

  const handleSave = (data) => {
    if (editingPericia) {
      updateMutation.mutate({ id: editingPericia.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pericia) => {
    setEditingPericia(pericia);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta perícia?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewPericia = () => {
    setEditingPericia(null);
    setIsModalOpen(true);
  };

  // BUG #2 fix: useCallback so hasAlert is stable and can be safely added to useMemo deps
  const hasAlert = useCallback((pericia) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Verifica alerta DCB
    if (pericia.dcb && !pericia.alerta_dcb_exibido) {
      const dcbDate = new Date(pericia.dcb + "T00:00:00");
      const diffDays = Math.ceil((dcbDate - hoje) / (1000 * 60 * 60 * 24));
      if (diffDays <= 15 && diffDays >= 0) return true;
    }

    // Verifica alerta perícia
    if (pericia.data_pericia && pericia.status === "Perícia Agendada") {
      const periciaDate = new Date(pericia.data_pericia + "T00:00:00");
      const diffDays = Math.ceil((periciaDate - hoje) / (1000 * 60 * 60 * 24));
      const alertasExibidos = pericia.alertas_pericia_exibidos || [];

      // Verifica numa lista estendida de dias comuns para cobrir customizações
      const diasVerificacao = [90, 60, 45, 30, 15, 10, 7, 5, 3, 2, 1];
      const hasUnreadAlert = diasVerificacao.some((dias) => {
        return (
          diffDays <= dias && diffDays >= 0 && !alertasExibidos.includes(dias)
        );
      });

      if (hasUnreadAlert) return true;
    }

    return false;
  }, []);

  const filteredPericias = useMemo(() => {
    let filtered = pericias.filter((pericia) => {
      const matchesSearch =
        pericia.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pericia.cpf?.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" || pericia.status === statusFilter;
      const matchesEsfera =
        esferaFilter === "all" || pericia.esfera === esferaFilter;

      return matchesSearch && matchesStatus && matchesEsfera;
    });

    // Ordenar: perícias com alerta primeiro, depois as demais
    filtered.sort((a, b) => {
      const aHasAlert = hasAlert(a);
      const bHasAlert = hasAlert(b);

      if (aHasAlert && !bHasAlert) return -1;
      if (!aHasAlert && bHasAlert) return 1;
      return 0;
    });

    return filtered;
  // BUG #2 fix: hasAlert added to deps so sort is always based on latest function closure
  }, [pericias, searchTerm, statusFilter, esferaFilter, hasAlert]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Gestão de Perícias
            </h1>
            <p className="text-slate-600 mt-1">
              Controle completo de perícias previdenciárias
            </p>
          </div>
          <Button
            onClick={handleNewPericia}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 text-white font-semibold px-6"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Perícia
          </Button>
        </div>

        {/* Stats Overview */}
        <StatsOverview pericias={pericias} />

        {/* Filters */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Filter className="w-5 h-5" />
              Filtros e Pesquisa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="Benefício Ativo">Benefício Ativo</option>
                <option value="Perícia Agendada">Perícia Agendada</option>
                <option value="Documentos Pendentes">
                  Documentos Pendentes
                </option>
                <option value="Benefício Cessado">Benefício Cessado</option>
                <option value="Benefício Negado">Benefício Negado</option>
              </select>

              <select
                value={esferaFilter}
                onChange={(e) => setEsferaFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as Esferas</option>
                <option value="Administrativa">Administrativa</option>
                <option value="Judicial">Judicial</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <PericiaTable
          pericias={filteredPericias}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMarkAsSeen={(pericia) => markSeenMutation.mutate(pericia)}
        />

        {/* Modal */}
        <PericiaModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPericia(null);
          }}
          onSave={handleSave}
          pericia={editingPericia}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}
