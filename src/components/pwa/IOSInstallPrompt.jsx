import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Prompt de instalação para dispositivos iOS/Safari
 * Safari não suporta beforeinstallprompt, então mostramos instruções manuais
 */
export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detectar se é iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.navigator.standalone === true;
    const isSafari =
      /Safari/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    const wasPromptDismissed =
      localStorage.getItem("ios_install_prompt_dismissed") === "true";
    const isInstalled = localStorage.getItem("pwa_installed") === "true";

    // Mostrar prompt se: é iOS Safari, não está instalado, não foi dismissado, e não está em standalone
    if (
      isIOS &&
      isSafari &&
      !isInStandaloneMode &&
      !wasPromptDismissed &&
      !isInstalled
    ) {
      // Esperar 3 segundos antes de mostrar
      setTimeout(() => setShowPrompt(true), 3000);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("ios_install_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 left-6 right-6 z-50 max-w-md mx-auto"
      >
        <Card className="border-2 border-[#1e3a5f] shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-[#1e3a5f] text-lg">
                Instalar LegalFlow
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-slate-600 mb-3">
              Instale este app na sua tela inicial para acesso rápido e melhor
              experiência.
            </p>

            <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-xs">1</span>
                </div>
                <p className="text-slate-700">
                  Toque no botão{" "}
                  <Share className="inline w-4 h-4 mx-1 text-blue-500" />{" "}
                  compartilhar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-xs">2</span>
                </div>
                <p className="text-slate-700">
                  Selecione <Plus className="inline w-4 h-4 mx-1" /> "Adicionar
                  à Tela de Início"
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3"
              onClick={handleDismiss}
            >
              Entendi
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
