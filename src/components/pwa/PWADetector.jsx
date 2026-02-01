import { useEffect, useState } from "react";

/**
 * Hook para detectar se o app está rodando como PWA instalado
 */
export function usePWADetection() {
  const [isPWA, setIsPWA] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar modo standalone (Chrome, Edge, Android)
    const standaloneMode = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

    // Detectar modo app no iOS
    const iosStandalone = window.navigator.standalone === true;

    // Verificar se foi instalado anteriormente via localStorage
    const wasInstalled = localStorage.getItem("pwa_installed") === "true";

    const isPWAMode = standaloneMode || iosStandalone || wasInstalled;

    setIsStandalone(standaloneMode || iosStandalone);
    setIsPWA(isPWAMode);

    // Se está em modo standalone mas não tinha registro, salvar
    if (isPWAMode && !wasInstalled) {
      localStorage.setItem("pwa_installed", "true");
    }
  }, []);

  return { isPWA, isStandalone };
}

/**
 * Componente que renderiza conteúdo diferente baseado no modo PWA
 */
export default function PWADetector({ children, fallback }) {
  const { isPWA } = usePWADetection();

  return isPWA ? children : fallback || null;
}
