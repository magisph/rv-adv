import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Verificar se já foi instalado anteriormente
    const isInstalled = localStorage.getItem("pwa_installed") === "true";
    if (isInstalled) {
      setShowButton(false);
      return;
    }

    // Verificar se já está rodando como PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      localStorage.setItem("pwa_installed", "true");
      setShowButton(false);
      return;
    }

    // Capturar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    // Detectar quando a instalação foi concluída
    const handleAppInstalled = () => {
      localStorage.setItem("pwa_installed", "true");
      setDeferredPrompt(null);
      setShowButton(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Mostrar prompt de instalação
      deferredPrompt.prompt();

      // Aguardar resposta do usuário
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        localStorage.setItem("pwa_installed", "true");
        setShowButton(false);
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error("Erro ao instalar PWA:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!showButton) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87] text-white shadow-2xl h-12 px-6 text-base font-medium"
          size="lg"
        >
          {isInstalling ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Instalando...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Instalar App
            </>
          )}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
