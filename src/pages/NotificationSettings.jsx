import React, { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Calendar,
  CheckSquare,
  FolderOpen,
  FileText,
  Moon,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_PROFILES = {
  all: {
    name: "📢 Todas",
    description: "Receber todas as notificações",
    settings: {
      prazos: { enabled: true, days: [7, 3, 1, 0] },
      tarefas: {
        enabled: true,
        atribuida: true,
        umDiaAntes: true,
        umaHoraAntes: true,
        concluida: true,
      },
      agendamentos: {
        enabled: true,
        umDiaAntes: true,
        umaHoraAntes: true,
        quinzeMinAntes: true,
      },
      processos: {
        enabled: true,
        movimentacoes: true,
        intimacoes: true,
        sentencas: true,
        despachos: true,
      },
      documentos: {
        enabled: true,
        novos: true,
        aprovados: true,
        vencendo: true,
      },
      clientes: { enabled: true, novos: true, mensagens: true },
    },
  },
  urgent: {
    name: "⚡ Urgentes Apenas",
    description: "Apenas prazos e tarefas urgentes",
    settings: {
      prazos: { enabled: true, days: [1, 0] },
      tarefas: {
        enabled: true,
        atribuida: true,
        umDiaAntes: true,
        umaHoraAntes: true,
        concluida: false,
      },
      agendamentos: {
        enabled: true,
        umDiaAntes: false,
        umaHoraAntes: true,
        quinzeMinAntes: true,
      },
      processos: {
        enabled: true,
        movimentacoes: false,
        intimacoes: true,
        sentencas: true,
        despachos: false,
      },
      documentos: {
        enabled: false,
        novos: false,
        aprovados: false,
        vencendo: true,
      },
      clientes: { enabled: false, novos: false, mensagens: false },
    },
  },
  silent: {
    name: "🔇 Modo Silencioso",
    description: "Desabilitar todas (exceto críticas)",
    settings: {
      prazos: { enabled: true, days: [0] },
      tarefas: {
        enabled: true,
        atribuida: true,
        umDiaAntes: false,
        umaHoraAntes: false,
        concluida: false,
      },
      agendamentos: {
        enabled: false,
        umDiaAntes: false,
        umaHoraAntes: false,
        quinzeMinAntes: false,
      },
      processos: {
        enabled: true,
        movimentacoes: false,
        intimacoes: true,
        sentencas: true,
        despachos: false,
      },
      documentos: {
        enabled: false,
        novos: false,
        aprovados: false,
        vencendo: false,
      },
      clientes: { enabled: false, novos: false, mensagens: false },
    },
  },
};

export default function NotificationSettings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(PRESET_PROFILES.all.settings);
  const [pushSettings, setPushSettings] = useState({
    enabled: false,
    prazosUrgentes: true,
    tarefasUrgentes: true,
    mencoes: true,
    todas: false,
  });
  const [silentMode, setSilentMode] = useState({
    enabled: false,
    startTime: "20:00",
    endTime: "08:00",
    weekends: true,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);

        // Carregar configurações salvas do usuário
        if (userData.notification_settings) {
          setSettings(userData.notification_settings);
        }
        if (userData.push_settings) {
          setPushSettings(userData.push_settings);
        }
        if (userData.silent_mode) {
          setSilentMode(userData.silent_mode);
        }
      } catch (e) {
        console.log("User not logged in");
      }
    };
    loadUser();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await authService.updateMe({
        notification_settings: settings,
        push_settings: pushSettings,
        silent_mode: silentMode,
      });
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries(["notifications"]);
    },
  });

  const applyPreset = (presetKey) => {
    setSettings(PRESET_PROFILES[presetKey].settings);
    toast.success(`Perfil "${PRESET_PROFILES[presetKey].name}" aplicado`);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    setSettings(PRESET_PROFILES.all.settings);
    setPushSettings({
      enabled: false,
      prazosUrgentes: true,
      tarefasUrgentes: true,
      mencoes: true,
      todas: false,
    });
    setSilentMode({
      enabled: false,
      startTime: "20:00",
      endTime: "08:00",
      weekends: true,
    });
    toast.success("Configurações restauradas para o padrão");
  };

  const updateSettings = (category, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const updatePushSettings = (field, value) => {
    setPushSettings((prev) => ({ ...prev, [field]: value }));
  };

  const updateSilentMode = (field, value) => {
    setSilentMode((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Configurações de Notificações
        </h1>
        <p className="text-slate-500 mt-1">
          Personalize como você recebe alertas e lembretes
        </p>
      </div>

      {/* Preset Profiles */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Perfis Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(PRESET_PROFILES).map(([key, profile]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <div className="font-semibold text-slate-800">
                  {profile.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {profile.description}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Notifications */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#1e3a5f]" />
            <CardTitle className="text-base">Notificações no Sistema</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prazos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <Label className="font-semibold">Prazos Processuais</Label>
              </div>
              <Switch
                checked={settings.prazos?.enabled}
                onCheckedChange={(v) => updateSettings("prazos", "enabled", v)}
              />
            </div>
            {settings.prazos?.enabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.prazos?.days?.includes(7)}
                    onCheckedChange={(v) => {
                      const days = settings.prazos?.days || [];
                      updateSettings(
                        "prazos",
                        "days",
                        v ? [...days, 7] : days.filter((d) => d !== 7),
                      );
                    }}
                  />
                  <Label className="text-sm">7 dias antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.prazos?.days?.includes(3)}
                    onCheckedChange={(v) => {
                      const days = settings.prazos?.days || [];
                      updateSettings(
                        "prazos",
                        "days",
                        v ? [...days, 3] : days.filter((d) => d !== 3),
                      );
                    }}
                  />
                  <Label className="text-sm">3 dias antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.prazos?.days?.includes(1)}
                    onCheckedChange={(v) => {
                      const days = settings.prazos?.days || [];
                      updateSettings(
                        "prazos",
                        "days",
                        v ? [...days, 1] : days.filter((d) => d !== 1),
                      );
                    }}
                  />
                  <Label className="text-sm">1 dia antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.prazos?.days?.includes(0)}
                    onCheckedChange={(v) => {
                      const days = settings.prazos?.days || [];
                      updateSettings(
                        "prazos",
                        "days",
                        v ? [...days, 0] : days.filter((d) => d !== 0),
                      );
                    }}
                  />
                  <Label className="text-sm">No dia</Label>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Tarefas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-slate-600" />
                <Label className="font-semibold">Tarefas</Label>
              </div>
              <Switch
                checked={settings.tarefas?.enabled}
                onCheckedChange={(v) => updateSettings("tarefas", "enabled", v)}
              />
            </div>
            {settings.tarefas?.enabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.tarefas?.atribuida}
                    onCheckedChange={(v) =>
                      updateSettings("tarefas", "atribuida", v)
                    }
                  />
                  <Label className="text-sm">Quando atribuída a mim</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.tarefas?.umDiaAntes}
                    onCheckedChange={(v) =>
                      updateSettings("tarefas", "umDiaAntes", v)
                    }
                  />
                  <Label className="text-sm">1 dia antes do vencimento</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.tarefas?.umaHoraAntes}
                    onCheckedChange={(v) =>
                      updateSettings("tarefas", "umaHoraAntes", v)
                    }
                  />
                  <Label className="text-sm">1 hora antes do vencimento</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.tarefas?.concluida}
                    onCheckedChange={(v) =>
                      updateSettings("tarefas", "concluida", v)
                    }
                  />
                  <Label className="text-sm">
                    Quando concluída por outro usuário
                  </Label>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Agendamentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <Label className="font-semibold">Agendamentos</Label>
              </div>
              <Switch
                checked={settings.agendamentos?.enabled}
                onCheckedChange={(v) =>
                  updateSettings("agendamentos", "enabled", v)
                }
              />
            </div>
            {settings.agendamentos?.enabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.agendamentos?.umDiaAntes}
                    onCheckedChange={(v) =>
                      updateSettings("agendamentos", "umDiaAntes", v)
                    }
                  />
                  <Label className="text-sm">1 dia antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.agendamentos?.umaHoraAntes}
                    onCheckedChange={(v) =>
                      updateSettings("agendamentos", "umaHoraAntes", v)
                    }
                  />
                  <Label className="text-sm">1 hora antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.agendamentos?.quinzeMinAntes}
                    onCheckedChange={(v) =>
                      updateSettings("agendamentos", "quinzeMinAntes", v)
                    }
                  />
                  <Label className="text-sm">15 minutos antes</Label>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Processos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-slate-600" />
                <Label className="font-semibold">Processos</Label>
              </div>
              <Switch
                checked={settings.processos?.enabled}
                onCheckedChange={(v) =>
                  updateSettings("processos", "enabled", v)
                }
              />
            </div>
            {settings.processos?.enabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.processos?.movimentacoes}
                    onCheckedChange={(v) =>
                      updateSettings("processos", "movimentacoes", v)
                    }
                  />
                  <Label className="text-sm">Novas movimentações</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.processos?.intimacoes}
                    onCheckedChange={(v) =>
                      updateSettings("processos", "intimacoes", v)
                    }
                  />
                  <Label className="text-sm">Intimações</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.processos?.sentencas}
                    onCheckedChange={(v) =>
                      updateSettings("processos", "sentencas", v)
                    }
                  />
                  <Label className="text-sm">Sentenças e decisões</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.processos?.despachos}
                    onCheckedChange={(v) =>
                      updateSettings("processos", "despachos", v)
                    }
                  />
                  <Label className="text-sm">Despachos</Label>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Documentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <Label className="font-semibold">Documentos</Label>
              </div>
              <Switch
                checked={settings.documentos?.enabled}
                onCheckedChange={(v) =>
                  updateSettings("documentos", "enabled", v)
                }
              />
            </div>
            {settings.documentos?.enabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.documentos?.novos}
                    onCheckedChange={(v) =>
                      updateSettings("documentos", "novos", v)
                    }
                  />
                  <Label className="text-sm">Novos documentos enviados</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.documentos?.aprovados}
                    onCheckedChange={(v) =>
                      updateSettings("documentos", "aprovados", v)
                    }
                  />
                  <Label className="text-sm">
                    Documentos aprovados/rejeitados
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.documentos?.vencendo}
                    onCheckedChange={(v) =>
                      updateSettings("documentos", "vencendo", v)
                    }
                  />
                  <Label className="text-sm">Certidões vencendo</Label>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Silent Mode */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-[#1e3a5f]" />
            <CardTitle className="text-base">Horário de Silêncio</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ativar modo silencioso</Label>
            <Switch
              checked={silentMode.enabled}
              onCheckedChange={(v) => updateSilentMode("enabled", v)}
            />
          </div>
          {silentMode.enabled && (
            <div className="space-y-3 ml-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Das</Label>
                  <Input
                    type="time"
                    value={silentMode.startTime}
                    onChange={(e) =>
                      updateSilentMode("startTime", e.target.value)
                    }
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">às</Label>
                  <Input
                    type="time"
                    value={silentMode.endTime}
                    onChange={(e) =>
                      updateSilentMode("endTime", e.target.value)
                    }
                    className="w-32"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={silentMode.weekends}
                  onCheckedChange={(v) => updateSilentMode("weekends", v)}
                />
                <Label className="text-sm">Incluir finais de semana</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar Padrões
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
