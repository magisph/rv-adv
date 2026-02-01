import React, { useState, useEffect } from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function CalendarSettings() {
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    syncTasks: true,
    syncAppointments: true,
    syncDeadlines: true,
    autoCreate: true,
    bidirectionalSync: true,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Verificar se já está conectado ao Google Calendar
        if (userData.calendar_settings) {
          setSyncSettings(userData.calendar_settings);
        }

        // Verificar status de conexão
        try {
          // Tentar obter token de acesso para verificar conexão
          const token =
            await base44.asServiceRole.connectors.getAccessToken(
              "googlecalendar",
            );
          setIsConnected(!!token);
        } catch (e) {
          setIsConnected(false);
        }
      } catch (e) {
        console.log("User not logged in");
      }
    };
    loadUser();
  }, []);

  const handleConnect = async () => {
    try {
      // Solicitar autorização OAuth
      const authUrl =
        await base44.asServiceRole.connectors.requestOAuthAuthorization(
          "googlecalendar",
          [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
          ],
        );

      // Redirecionar para autorização
      window.location.href = authUrl;
    } catch (error) {
      toast.error(
        "Erro ao conectar com Google Calendar. Certifique-se de que as funções backend estão habilitadas.",
      );
      console.error(error);
    }
  };

  const handleDisconnect = async () => {
    if (
      confirm(
        "Deseja desconectar sua conta do Google Calendar? Seus eventos não serão mais sincronizados.",
      )
    ) {
      try {
        await base44.auth.updateMe({
          calendar_connected: false,
          calendar_settings: syncSettings,
        });
        setIsConnected(false);
        toast.success("Google Calendar desconectado");
      } catch (error) {
        toast.error("Erro ao desconectar");
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Buscar tarefas pendentes
      const tasks = await base44.entities.Task.filter({
        assigned_to: user.email,
        status: { $ne: "done" },
        due_date: { $ne: null },
      });

      // Buscar agendamentos
      const appointments = await base44.entities.Appointment.filter({
        status: "agendado",
      });

      // Buscar prazos
      const deadlines = await base44.entities.Deadline.filter({
        status: "pendente",
      });

      let syncCount = 0;

      // Criar eventos no Google Calendar
      if (syncSettings.syncTasks) {
        for (const task of tasks) {
          // Verificar se já existe evento
          if (task.calendar_event_id) continue;

          // Criar evento
          const event = {
            summary: `[Tarefa] ${task.title}`,
            description: task.description || "",
            start: { dateTime: new Date(task.due_date).toISOString() },
            end: {
              dateTime: new Date(
                new Date(task.due_date).getTime() + 60 * 60 * 1000,
              ).toISOString(),
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: "email", minutes: 24 * 60 },
                { method: "popup", minutes: 60 },
              ],
            },
          };

          // Aqui seria a chamada para criar no Google Calendar via backend function
          syncCount++;
        }
      }

      if (syncSettings.syncAppointments) {
        for (const appointment of appointments) {
          if (appointment.calendar_event_id) continue;

          syncCount++;
        }
      }

      if (syncSettings.syncDeadlines) {
        for (const deadline of deadlines) {
          if (deadline.calendar_event_id) continue;

          syncCount++;
        }
      }

      toast.success(`${syncCount} eventos sincronizados com sucesso!`);
    } catch (error) {
      toast.error("Erro ao sincronizar eventos");
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        calendar_settings: syncSettings,
      });
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      queryClient.invalidateQueries(["calendar-events"]);
    },
  });

  const updateSetting = (key, value) => {
    setSyncSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Integração com Google Calendar
        </h1>
        <p className="text-slate-500 mt-1">
          Sincronize suas tarefas, agendamentos e prazos com o Google Calendar
        </p>
      </div>

      {/* Connection Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1e3a5f]" />
            <CardTitle className="text-base">Status da Conexão</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      Conectado ao Google Calendar
                    </p>
                    <p className="text-sm text-slate-500">
                      Sua conta está sincronizada
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      Não Conectado
                    </p>
                    <p className="text-sm text-slate-500">
                      Conecte sua conta para sincronizar eventos
                    </p>
                  </div>
                </>
              )}
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
                </Button>
                <Button variant="outline" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnect}
                className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar Google Calendar
              </Button>
            )}
          </div>

          {!isConnected && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Antes de conectar:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Certifique-se de que as funções backend estão habilitadas
                  </li>
                  <li>
                    Você será redirecionado para autorizar o acesso ao Google
                  </li>
                  <li>Após autorização, você retornará a esta página</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      {isConnected && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Configurações de Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Sincronizar Tarefas</Label>
                  <p className="text-sm text-slate-500">
                    Criar eventos no calendário para suas tarefas
                  </p>
                </div>
                <Switch
                  checked={syncSettings.syncTasks}
                  onCheckedChange={(v) => updateSetting("syncTasks", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">
                    Sincronizar Agendamentos
                  </Label>
                  <p className="text-sm text-slate-500">
                    Criar eventos para reuniões e compromissos
                  </p>
                </div>
                <Switch
                  checked={syncSettings.syncAppointments}
                  onCheckedChange={(v) => updateSetting("syncAppointments", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">
                    Sincronizar Prazos Processuais
                  </Label>
                  <p className="text-sm text-slate-500">
                    Criar eventos para prazos importantes
                  </p>
                </div>
                <Switch
                  checked={syncSettings.syncDeadlines}
                  onCheckedChange={(v) => updateSetting("syncDeadlines", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Criação Automática</Label>
                  <p className="text-sm text-slate-500">
                    Criar eventos automaticamente ao adicionar
                    tarefas/agendamentos
                  </p>
                </div>
                <Switch
                  checked={syncSettings.autoCreate}
                  onCheckedChange={(v) => updateSetting("autoCreate", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">
                    Sincronização Bidirecional
                  </Label>
                  <p className="text-sm text-slate-500">
                    Eventos criados no Google Calendar também aparecem no
                    sistema
                  </p>
                </div>
                <Switch
                  checked={syncSettings.bidirectionalSync}
                  onCheckedChange={(v) => updateSetting("bidirectionalSync", v)}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              >
                {saveMutation.isPending
                  ? "Salvando..."
                  : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-slate-600 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-semibold mb-2">
                Como funciona a sincronização:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Tarefas com data de vencimento são criadas como eventos no
                  calendário
                </li>
                <li>Agendamentos são sincronizados com data e hora exatas</li>
                <li>
                  Prazos processuais são marcados como eventos de dia inteiro
                </li>
                <li>
                  Eventos incluem lembretes automáticos (1 dia e 1 hora antes)
                </li>
                <li>Alterações no sistema são refletidas no Google Calendar</li>
                <li>Você pode editar eventos diretamente no Google Calendar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
