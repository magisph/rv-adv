import React, { useState } from "react";
import { periciaService } from "@/modules/periciapro/services/periciaService";
import { activityLogService } from "@/modules/periciapro/services/activityLogService";
import { lembreteService } from "@/modules/periciapro/services/lembreteService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  FileText,
  History as HistoryIcon,
  Bell,
  Pencil,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ActivityLogTab from "../components/cliente/ActivityLogTab";
import DocumentsTab from "../components/cliente/DocumentsTab";
import RemindersTab from "../components/cliente/RemindersTab";
import PericiaModal from "../components/dashboard/PericiaModal";
import GoogleCalendarButton from "../components/calendar/GoogleCalendarButton";
import GoogleCalendarSync from "../components/calendar/GoogleCalendarSync";

export default function DetalhesCliente() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch Pericia
  const { data: pericia, isLoading } = useQuery({
    queryKey: ["pericia", id],
    queryFn: async () => {
      const result = await periciaService.getById(id);
      return result;
    },
    enabled: !!id,
  });

  // Fetch Logs
  const { data: logs = [] } = useQuery({
    queryKey: ["logs", id],
    queryFn: () =>
      activityLogService.listByPericia(id),
    enabled: !!id,
  });

  // Fetch Reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", id],
    queryFn: () =>
      lembreteService.listByPericia(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => periciaService.update(id, data),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pericia", id] });
      queryClient.invalidateQueries({ queryKey: ["pericias"] }); // Atualiza dashboard também

      // BUG #3 fix: wrap log in try/catch — log failure must not block modal close,
      // and exceptions in onSuccess are silently swallowed by TanStack Query.
      try {
        await activityLogService.create({
          pericia_id: id,
          type: "update",
          description: "Dados da perícia atualizados",
        });
        queryClient.invalidateQueries({ queryKey: ["logs", id] });
      } catch (logError) {
        console.warn("[DetalhesCliente] Log de atividade falhou (não crítico):", logError);
      }

      setIsEditModalOpen(false);
    },
  });

  if (isLoading || !pericia) {
    return <div className="p-8 text-center">Carregando detalhes...</div>;
  }

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["pericia", id] });
    queryClient.invalidateQueries({ queryKey: ["logs", id] });
    queryClient.invalidateQueries({ queryKey: ["reminders", id] });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {pericia.nome}
            </h1>
            <p className="text-slate-600">
              CPF: {pericia.cpf} • {pericia.esfera}
            </p>
          </div>
          <Button onClick={() => setIsEditModalOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar Dados
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Status Atual</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-semibold text-lg">{pericia.status}</span>
                <Badge variant="outline" className="bg-blue-50">
                  {pericia.esfera}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 mb-2">Próxima Perícia</p>
              <p className="font-semibold text-lg mb-3">
                {pericia.data_pericia ? (
                  <>
                    {new Date(
                      pericia.data_pericia + "T00:00:00",
                    ).toLocaleDateString("pt-BR")}
                    {pericia.horario_pericia &&
                      ` às ${pericia.horario_pericia}`}
                  </>
                ) : (
                  "-"
                )}
              </p>

              <GoogleCalendarSync
                pericia={pericia}
                onSyncComplete={refreshData}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Data DCB</p>
              <p className="font-semibold text-lg mt-1">
                {pericia.dcb
                  ? new Date(pericia.dcb + "T00:00:00").toLocaleDateString(
                      "pt-BR",
                    )
                  : "-"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="w-full justify-start h-12 bg-white p-1 border shadow-sm">
            <TabsTrigger
              value="history"
              className="flex-1 md:flex-none data-[state=active]:bg-slate-100"
            >
              <HistoryIcon className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex-1 md:flex-none data-[state=active]:bg-slate-100"
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentos ({pericia.documentos?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="reminders"
              className="flex-1 md:flex-none data-[state=active]:bg-slate-100"
            >
              <Bell className="w-4 h-4 mr-2" />
              Lembretes ({reminders.filter((r) => !r.concluido).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <ActivityLogTab logs={logs} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab pericia={pericia} onUpdate={refreshData} />
          </TabsContent>

          <TabsContent value="reminders">
            <RemindersTab
              reminders={reminders}
              periciaId={id}
              onUpdate={refreshData}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PericiaModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(data) => updateMutation.mutate({ id: pericia.id, data })}
        pericia={pericia}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
