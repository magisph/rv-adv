import React, { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Save, Loader2 } from "lucide-react";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    oab_number: "",
    oab_state: "",
    office_name: "",
    office_address: "",
    office_phone: "",
  });
  const [notifications, setNotifications] = useState({
    deadline_alerts: true,
    move_alerts: true,
    email_notifications: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || "",
        oab_number: userData.oab_number || "",
        oab_state: userData.oab_state || "",
        office_name: userData.office_name || "",
        office_address: userData.office_address || "",
        office_phone: userData.office_phone || "",
      });
      setNotifications({
        deadline_alerts: userData.deadline_alerts !== false,
        move_alerts: userData.move_alerts !== false,
        email_notifications: userData.email_notifications === true,
      });
    };
    loadUser();
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data) => authService.updateMe(data),
    onSuccess: async () => {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    },
  });

  const handleSaveProfile = () => {
    updateMutation.mutate(formData);
  };

  const handleSaveNotifications = () => {
    updateMutation.mutate(notifications);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500">Gerencie suas preferências</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações profissionais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oab_number">Número OAB</Label>
                  <Input
                    id="oab_number"
                    value={formData.oab_number}
                    onChange={(e) =>
                      setFormData({ ...formData, oab_number: e.target.value })
                    }
                    placeholder="000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="oab_state">Seccional OAB</Label>
                  <Input
                    id="oab_state"
                    value={formData.oab_state}
                    onChange={(e) =>
                      setFormData({ ...formData, oab_state: e.target.value })
                    }
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium mb-4">Dados do Escritório</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="office_name">Nome do Escritório</Label>
                    <Input
                      id="office_name"
                      value={formData.office_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          office_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office_phone">Telefone</Label>
                    <Input
                      id="office_phone"
                      value={formData.office_phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          office_phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="office_address">Endereço</Label>
                    <Input
                      id="office_address"
                      value={formData.office_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          office_address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Preferências de Notificações</CardTitle>
              <CardDescription>
                Configure como deseja receber alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Alertas de Prazos</p>
                    <p className="text-sm text-slate-500">
                      Notificações quando prazos estiverem próximos
                    </p>
                  </div>
                  <Switch
                    checked={notifications.deadline_alerts}
                    onCheckedChange={(v) =>
                      setNotifications({ ...notifications, deadline_alerts: v })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Alertas de Movimentações</p>
                    <p className="text-sm text-slate-500">
                      Notificações quando novas movimentações forem importadas
                    </p>
                  </div>
                  <Switch
                    checked={notifications.move_alerts}
                    onCheckedChange={(v) =>
                      setNotifications({ ...notifications, move_alerts: v })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Notificações por E-mail</p>
                    <p className="text-sm text-slate-500">
                      Receber alertas também por e-mail
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_notifications}
                    onCheckedChange={(v) =>
                      setNotifications({
                        ...notifications,
                        email_notifications: v,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={updateMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
