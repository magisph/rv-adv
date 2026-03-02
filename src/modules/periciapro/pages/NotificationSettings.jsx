import React, { useState, useEffect } from "react";
import { notificationPreferencesService } from "@/modules/periciapro/services/notificationPreferencesService";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Bell,
  Mail,
  CheckCircle,
  AlertCircle,
  Calendar,
  Save,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NotificationService } from "../components/notifications/NotificationService";
import AlertDaysInput from "../components/notifications/AlertDaysInput";

export default function NotificationSettings() {
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      return await notificationPreferencesService.getByUser(user.id);
    },
    enabled: !!user?.id,
  });

  const [settings, setSettings] = useState({
    email_notifications_enabled: true,
    in_app_notifications_enabled: true,
    dcb_alert_days: [15, 7, 3, 1],
    pericia_alert_days: [45, 30, 15, 7, 3, 1],
    email_daily_digest: false,
    critical_alerts_only: false,
    dcb_alert_template:
      "⚠️ DCB se aproxima - {{nome}}. Benefício cessa em {{dias}} dias ({{data}}).",
    pericia_alert_template:
      "📅 Perícia: {{nome}}. Faltam {{dias}} dias. Agendada para {{data}} às {{hora}}.",
  });

  useEffect(() => {
    if (preferences) {
      setSettings({
        email_notifications_enabled:
          preferences.email_notifications_enabled ?? true,
        in_app_notifications_enabled:
          preferences.in_app_notifications_enabled ?? true,
        dcb_alert_days: preferences.dcb_alert_days ?? [15, 7, 3, 1],
        pericia_alert_days: preferences.pericia_alert_days ?? [
          45, 30, 15, 7, 3, 1,
        ],
        email_daily_digest: preferences.email_daily_digest ?? false,
        critical_alerts_only: preferences.critical_alerts_only ?? false,
        dcb_alert_template:
          preferences.dcb_alert_template ??
          "⚠️ DCB se aproxima - {{nome}}. Benefício cessa em {{dias}} dias ({{data}}).",
        pericia_alert_template:
          preferences.pericia_alert_template ??
          "📅 Perícia: {{nome}}. Faltam {{dias}} dias. Agendada para {{data}} às {{hora}}.",
      });
    }
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return await notificationPreferencesService.upsert(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleTestNotification = async () => {
    const success = await NotificationService.testNativeNotification();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      alert("Permissão de notificação negada ou não suportada");
    }
  };

  // Toggles removidos pois agora usamos o componente AlertDaysInput genérico

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-64 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="w-10 h-10 text-purple-600" />
            Configurações de Notificações
          </h1>
          <p className="text-slate-600 mt-1">
            Personalize como e quando você deseja receber alertas
          </p>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <Alert className="bg-green-50 border-green-300 animate-in fade-in slide-in-from-top-5">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              Configurações salvas com sucesso!
            </AlertDescription>
          </Alert>
        )}

        {/* General Settings */}
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-purple-50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Bell className="w-5 h-5 text-purple-600" />
              Notificações Gerais
            </CardTitle>
            <CardDescription>
              Ative ou desative os canais de notificação
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Browser Notifications Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Status de Notificações do Sistema
                  </h4>
                  <p className="text-sm text-blue-700">
                    {typeof window !== "undefined" &&
                    "Notification" in window ? (
                      Notification.permission === "granted" ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Notificações ativadas no navegador
                        </span>
                      ) : Notification.permission === "denied" ? (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          Notificações bloqueadas. Desbloqueie nas configurações
                          do navegador.
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          Permissão de notificação pendente
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-600" />
                        Notificações não suportadas neste navegador
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleTestNotification}
                  size="sm"
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Testar
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="in-app" className="text-base font-semibold">
                  Notificações no Aplicativo
                </Label>
                <p className="text-sm text-slate-600">
                  Receba alertas diretamente no sistema (sino de notificações)
                </p>
              </div>
              <Switch
                id="in-app"
                checked={settings.in_app_notifications_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    in_app_notifications_enabled: checked,
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="email"
                  className="text-base font-semibold flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Notificações por Email
                </Label>
                <p className="text-sm text-slate-600">
                  Receba alertas importantes no seu email
                </p>
              </div>
              <Switch
                id="email"
                checked={settings.email_notifications_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    email_notifications_enabled: checked,
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="daily-digest"
                  className="text-base font-semibold"
                >
                  Resumo Diário
                </Label>
                <p className="text-sm text-slate-600">
                  Receba um resumo diário de todos os alertas por email
                </p>
              </div>
              <Switch
                id="daily-digest"
                checked={settings.email_daily_digest}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    email_daily_digest: checked,
                  }))
                }
                disabled={!settings.email_notifications_enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label
                  htmlFor="critical-only"
                  className="text-base font-semibold"
                >
                  Apenas Alertas Críticos
                </Label>
                <p className="text-sm text-slate-600">
                  Receber apenas notificações com 7 dias ou menos
                </p>
              </div>
              <Switch
                id="critical-only"
                checked={settings.critical_alerts_only}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    critical_alerts_only: checked,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* DCB Alerts */}
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-red-50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Alertas de DCB (Data de Cessação do Benefício)
            </CardTitle>
            <CardDescription>
              Escolha quando ser notificado antes da data de cessação
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AlertDaysInput
              label="Configurar prazos de alerta (dias antes):"
              days={settings.dcb_alert_days}
              onChange={(newDays) =>
                setSettings((prev) => ({ ...prev, dcb_alert_days: newDays }))
              }
            />
            <div className="mt-4 space-y-2">
              <Label htmlFor="dcb-template">Mensagem Personalizada</Label>
              <Textarea
                id="dcb-template"
                value={settings.dcb_alert_template}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    dcb_alert_template: e.target.value,
                  }))
                }
                placeholder="Template da mensagem..."
              />
              <p className="text-xs text-slate-500">
                Variáveis disponíveis: {"{{nome}}"}, {"{{dias}}"}, {"{{data}}"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Perícia Alerts */}
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-purple-50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="w-5 h-5 text-purple-600" />
              Alertas de Perícia Agendada
            </CardTitle>
            <CardDescription>
              Escolha quando ser notificado antes da data da perícia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AlertDaysInput
              label="Configurar prazos de alerta (dias antes):"
              days={settings.pericia_alert_days}
              onChange={(newDays) =>
                setSettings((prev) => ({
                  ...prev,
                  pericia_alert_days: newDays,
                }))
              }
            />
            <div className="mt-4 space-y-2">
              <Label htmlFor="pericia-template">Mensagem Personalizada</Label>
              <Textarea
                id="pericia-template"
                value={settings.pericia_alert_template}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    pericia_alert_template: e.target.value,
                  }))
                }
                placeholder="Template da mensagem..."
              />
              <p className="text-xs text-slate-500">
                Variáveis disponíveis: {"{{nome}}"}, {"{{dias}}"}, {"{{data}}"},{" "}
                {"{{hora}}"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-end">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="md:w-48 h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg font-semibold"
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card - Updated */}
        <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-slate-700 space-y-2">
            <p>
              <strong>Sobre os alertas:</strong> As notificações são geradas
              automaticamente com base nas datas de DCB e perícias cadastradas.
            </p>
            <p>
              <strong>Notificações nativas:</strong> Para receber alertas na
              barra de notificações do seu dispositivo (Android/iOS),
              certifique-se de:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Ter concedido permissão de notificações para o navegador</li>
              <li>
                Instalar o app PWA (botão "Instalar App" no canto superior)
              </li>
              <li>Manter o app aberto em segundo plano ou instalado</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
