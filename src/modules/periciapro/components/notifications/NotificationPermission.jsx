import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, X, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NotificationPermission() {
  const [permission, setPermission] = useState("default");
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar se notificações são suportadas
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Mostrar prompt se permissão ainda não foi concedida
      if (Notification.permission === "default") {
        const dismissed = localStorage.getItem(
          "notification-permission-dismissed",
        );
        if (!dismissed) {
          setShowPrompt(true);
        }
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Mostrar notificação de teste
        new Notification("PeríciasPro - Notificações Ativadas! 🎉", {
          body: "Você receberá alertas importantes sobre DCB e perícias.",
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          tag: "permission-granted",
          requireInteraction: false,
        });

        // Registrar service worker se ainda não estiver registrado
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker
            .register("/service-worker.js")
            .catch(() => {});
        }
      }

      setShowPrompt(false);
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("notification-permission-dismissed", "true");
  };

  // Não mostrar se não for suportado
  if (!isSupported) {
    return null;
  }

  // Não mostrar se já concedida ou negada
  if (permission !== "default" || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5">
      <Card className="shadow-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-purple-600 animate-pulse" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Ativar Notificações
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Receba alertas importantes sobre DCB e perícias diretamente no
                seu dispositivo, mesmo com o app fechado.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={requestPermission}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg h-8"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativar
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-slate-600"
                >
                  Depois
                </Button>
              </div>
            </div>
            <Button
              onClick={handleDismiss}
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-slate-200"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
