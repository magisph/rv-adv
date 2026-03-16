import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  Download,
  Smartphone,
  Share,
  Info,
  Zap,
  Wifi,
  CheckCircle2,
  ArrowDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PWA_STORAGE_KEY = "pwa-install-state";

export default function PWAInstallPrompt({ delay = 10000 }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const platformNameRef = useRef("");
  const isIOSRef = useRef(false);
  const [canShow, setCanShow] = useState(false);

  // Funções de gerenciamento de estado PWA
  const getPWAState = () => {
    try {
      const stored = localStorage.getItem(PWA_STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored);

      // Verifica expiração (30 dias)
      const expirationDate = new Date(state.timestamp);
      expirationDate.setDate(expirationDate.getDate() + 30);

      if (new Date() > expirationDate) {
        localStorage.removeItem(PWA_STORAGE_KEY);
        return null;
      }

      return state;
    } catch (e) {
      return null;
    }
  };

  // Usa refs para evitar stale closure nos callbacks registrados nos event listeners
  const setPWAState = useCallback((dismissed, installed = false) => {
    const state = {
      dismissed,
      installed,
      timestamp: new Date().toISOString(),
      platform: platformNameRef.current || (isIOSRef.current ? "ios" : "android/desktop"),
    };
    localStorage.setItem(PWA_STORAGE_KEY, JSON.stringify(state));
  }, []);

  // Delay para não sobrecarregar usuário
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    // Verificar se já está instalado
    const checkIfInstalled = () => {
      // Verifica display-mode standalone (Standard)
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
        return true;
      }

      // Verifica display-mode fullscreen (Android/Windows)
      if (window.matchMedia("(display-mode: fullscreen)").matches) {
        setIsInstalled(true);
        return true;
      }

      // Verifica display-mode minimal-ui
      if (window.matchMedia("(display-mode: minimal-ui)").matches) {
        setIsInstalled(true);
        return true;
      }

      // Verifica iOS standalone
      if (window.navigator.standalone === true) {
        setIsInstalled(true);
        return true;
      }

      // Android: verifica se foi lançado de installed app
      if (document.referrer.includes("android-app://")) {
        setIsInstalled(true);
        return true;
      }

      return false;
    };

    // Detectar plataforma de forma avançada
    const detectPlatform = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      // navigator.platform is deprecated but still useful for broad detection alongside userAgent
      const platform = (window.navigator.platform || "").toLowerCase();

      // Detecta iPad moderno (iPadOS 13+)
      const isIPad =
        /ipad/.test(userAgent) ||
        (platform === "macintel" && navigator.maxTouchPoints > 1);

      // Detecta iPhone/iPod
      const isIPhone = /iphone|ipod/.test(userAgent);

      // Detecta se é Safari (único navegador iOS que suporta PWA)
      const isSafari =
        /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

      // iOS válido = dispositivo iOS + Safari + não standalone
      const isValidIOS =
        (isIPad || isIPhone) && isSafari && !window.navigator.standalone;

      let name = "Dispositivo";
      if (isValidIOS) name = "iOS";
      else if (/android/.test(userAgent)) name = "Android";
      else if (/win/.test(platform) || /windows/.test(userAgent))
        name = "Windows";
      else if (/mac/.test(platform) || /macintosh/.test(userAgent))
        name = "Mac";
      else if (/linux/.test(platform) || /linux/.test(userAgent))
        name = "Linux";

      setIsIOS(isValidIOS);
      isIOSRef.current = isValidIOS;
      setPlatformName(name);
      platformNameRef.current = name;
    };

    // Verificar requisitos PWA
    const checkPWARequirements = async () => {
      const requirements = {
        https: false,
        manifest: false,
        serviceWorker: false,
      };

      // Verifica HTTPS (ou localhost para dev)
      requirements.https =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost";

      // Verifica Manifest
      try {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          const response = await fetch(manifestLink.href);
          const manifest = await response.json();
          requirements.manifest = !!(manifest.name && manifest.start_url);
        }
      } catch (e) {
        console.warn("⚠️ PWA: Manifest não encontrado ou inválido");
      }

      // Verifica Service Worker
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        requirements.serviceWorker = registrations.length > 0;
      }


      return requirements;
    };

    detectPlatform();

    if (checkIfInstalled()) {
      return;
    }

    // Verificar estado anterior
    const pwaState = getPWAState();
    if (pwaState?.dismissed && !pwaState?.installed) {
      return;
    }

    // Verificar requisitos antes de mostrar
    checkPWARequirements().then((req) => {
      if (!req.https) {
        console.warn("⚠️ PWA: HTTPS não ativo");
        return;
      }

      if (!req.manifest) {
        console.warn("⚠️ PWA: Manifest não encontrado");
      }
    });

    // Evento para Android/Desktop/Chrome
    const handleBeforeInstallPrompt = (e) => {
      // Previne o mini-infobar automático do Chrome
      e.preventDefault();
      // Salva o evento para usar depois
      setDeferredPrompt(e);
      // Mostra o botão de instalação customizado
      setShowInstallButton(true);
    };

    // Evento quando o app é instalado
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
      setPWAState(false, true); // Limpa dismissal
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Para iOS, mostrar botão se não estiver instalado
    if (isIOS && !checkIfInstalled() && !pwaState?.dismissed) {
      setShowInstallButton(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isIOS]);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Para iOS, mostrar instruções
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      console.warn("⚠️ PWA: beforeinstallprompt não disponível");
      return;
    }

    try {
      // Mostrar prompt de instalação nativo
      await deferredPrompt.prompt();

      // Aguardar a escolha do usuário
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        setShowInstallButton(false);
        setIsInstalled(true);
        setPWAState(false, true);
      }
      // Se cancelado, não marca como dismissed

      // Limpar o prompt salvo
      setDeferredPrompt(null);
    } catch (error) {
      console.error("❌ PWA: Erro ao instalar:", error);
      alert("Não foi possível instalar o app. Tente novamente mais tarde.");
    }
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    setPWAState(true, false);
  };

  // Não mostrar se delay não passou
  if (!canShow) {
    return null;
  }

  // Não mostrar nada se já estiver instalado
  if (isInstalled) {
    return null;
  }

  // Não mostrar se não deve exibir o botão
  if (!showInstallButton) {
    return null;
  }

  return (
    <>
      {/* Botão de Instalação - Flutuante no canto superior direito */}
      <div
        className="fixed top-20 right-4 z-40 animate-in fade-in slide-in-from-top-5 max-w-sm"
        role="dialog"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
      >
        <Card className="shadow-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone
                    className="w-5 h-5 text-blue-600"
                    aria-hidden="true"
                  />
                  <h3
                    id="pwa-install-title"
                    className="font-bold text-slate-900 text-sm"
                  >
                    Instalar no {platformName}
                  </h3>
                </div>
                <p
                  id="pwa-install-description"
                  className="text-xs text-slate-600 mb-3"
                >
                  Instale o aplicativo no seu {platformName} para acesso rápido
                  e offline
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleInstallClick}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg h-8"
                    aria-label="Instalar aplicativo na tela inicial"
                  >
                    <Download className="w-3 h-3 mr-1" aria-hidden="true" />
                    Instalar App
                  </Button>
                  <Button
                    onClick={() => setShowLearnMore(true)}
                    size="sm"
                    variant="outline"
                    className="h-8 text-blue-700 border-blue-300 hover:bg-blue-50"
                    aria-label="Saiba mais sobre instalação"
                  >
                    <Info className="w-3 h-3 mr-1" aria-hidden="true" />
                    Saiba Mais
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                    className="h-8 text-slate-600"
                    aria-label="Dispensar prompt de instalação"
                  >
                    Agora não
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleDismiss}
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-slate-200"
                aria-label="Fechar prompt de instalação"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal "Saiba Mais" - Benefícios do PWA */}
      <Dialog
        open={showLearnMore}
        onOpenChange={setShowLearnMore}
        aria-labelledby="learn-more-title"
      >
        <DialogContent
          className="max-w-lg"
          onEscapeKeyDown={() => setShowLearnMore(false)}
        >
          <DialogHeader>
            <DialogTitle
              id="learn-more-title"
              className="flex items-center gap-2 text-2xl"
            >
              <Zap className="w-6 h-6 text-blue-600" aria-hidden="true" />
              Por que instalar o PeríciasPro?
            </DialogTitle>
            <DialogDescription>
              Instalar o aplicativo oferece uma experiência superior ao
              navegador tradicional
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Benefício 1 - Acesso Rápido */}
            <div className="flex gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">
                  Acesso Instantâneo
                </h4>
                <p className="text-sm text-slate-600">
                  Abra o app direto da tela inicial, sem precisar abrir o
                  navegador. Carregamento até <strong>3x mais rápido</strong>{" "}
                  que a versão web.
                </p>
              </div>
            </div>

            {/* Benefício 2 - Offline */}
            <div className="flex gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <Wifi className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">
                  Funciona Offline
                </h4>
                <p className="text-sm text-slate-600">
                  Continue trabalhando mesmo sem internet. Suas páginas
                  visitadas ficam disponíveis offline e sincronizam
                  automaticamente quando voltar online.
                </p>
              </div>
            </div>

            {/* Benefício 3 - Notificações */}
            <div className="flex gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                <CheckCircle2
                  className="w-6 h-6 text-white"
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">
                  Notificações em Tempo Real
                </h4>
                <p className="text-sm text-slate-600">
                  Receba alertas importantes sobre DCB e perícias diretamente no
                  seu dispositivo, mesmo com o app fechado.
                </p>
              </div>
            </div>

            {/* Benefício 4 - Experiência Nativa */}
            <div className="flex gap-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">
                  Experiência de App Nativo
                </h4>
                <p className="text-sm text-slate-600">
                  Interface em tela cheia, sem barras de navegação do navegador.
                  Parece e funciona como um aplicativo real.
                </p>
              </div>
            </div>

            {/* Segurança e Privacidade */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600">
                <strong className="text-slate-900">🔒 100% Seguro:</strong> O
                app instalado é o mesmo site que você já usa, apenas com
                recursos extras. Seus dados continuam protegidos e você pode
                desinstalar a qualquer momento.
              </p>
            </div>

            {/* Compatibilidade */}
            <div className="flex justify-center gap-4 py-2 border-t border-slate-100">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mb-1">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Android/iOS
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mb-1">
                  <Download className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Windows PC
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLearnMore(false)}>
              Voltar
            </Button>
            <Button
              onClick={() => {
                setShowLearnMore(false);
                handleInstallClick();
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Instalar Agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Instruções para iOS - Com Animação */}
      <Dialog
        open={showIOSInstructions}
        onOpenChange={setShowIOSInstructions}
        aria-labelledby="ios-install-title"
      >
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={() => setShowIOSInstructions(false)}
        >
          <DialogHeader>
            <DialogTitle
              id="ios-install-title"
              className="flex items-center gap-2 text-xl"
            >
              <Smartphone
                className="w-6 h-6 text-blue-600"
                aria-hidden="true"
              />
              Instalar PeríciasPro no iOS
            </DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para instalar o app na sua tela inicial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Animação Demonstrativa */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border-2 border-blue-200">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-semibold text-blue-900 text-center">
                  Demonstração Visual
                </p>
                <div className="relative w-full max-w-[200px]">
                  {/* Simulação da barra do Safari */}
                  <div className="bg-white rounded-t-2xl border-2 border-slate-300 p-3 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-slate-500 truncate flex-1">
                        {typeof window !== 'undefined' ? window.location.hostname : 'app'}
                      </div>
                      <Share className="w-5 h-5 text-blue-600 animate-bounce" />
                    </div>
                  </div>
                  {/* Seta animada apontando para o botão compartilhar */}
                  <div className="absolute -right-6 top-3 flex items-center gap-1 animate-pulse">
                    <ArrowDown className="w-5 h-5 text-red-500 transform -rotate-90" />
                    <span className="text-xs font-bold text-red-500">
                      Toque aqui
                    </span>
                  </div>
                  {/* Menu de compartilhamento simulado */}
                  <div className="bg-white rounded-b-2xl border-2 border-t-0 border-slate-300 p-4 shadow-lg space-y-2">
                    <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-lg">+</span>
                      </div>
                      <span className="text-sm font-medium animate-pulse text-blue-900">
                        Adicionar à Tela Inicial
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-2 opacity-30">
                      <div className="w-8 h-8 rounded-full bg-slate-100" />
                      <span className="text-sm text-slate-400">Copiar</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 opacity-30">
                      <div className="w-8 h-8 rounded-full bg-slate-100" />
                      <span className="text-sm text-slate-400">WhatsApp</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Passo 1 */}
            <div className="flex gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold"
                aria-hidden="true"
              >
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Toque no botão Compartilhar
                </h4>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                  <Share className="w-5 h-5 text-blue-600" aria-hidden="true" />
                  <span className="text-sm text-slate-700">
                    Localizado na barra inferior do Safari
                  </span>
                </div>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="flex gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold"
                aria-hidden="true"
              >
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Role e selecione "Adicionar à Tela Inicial"
                </h4>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="text-white text-lg font-bold">+</span>
                    </div>
                    <span className="text-sm text-slate-700">
                      Adicionar à Tela Inicial
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="flex gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold"
                aria-hidden="true"
              >
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Confirme tocando em "Adicionar"
                </h4>
                <p className="text-sm text-slate-600">
                  O app será instalado na sua tela inicial e você poderá
                  acessá-lo como qualquer outro aplicativo!
                </p>
              </div>
            </div>

            {/* Ícone de Sucesso */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className="w-8 h-8 text-green-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    Pronto para usar!
                  </p>
                  <p className="text-xs text-slate-600">
                    Acesso rápido, offline e com notificações
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowIOSInstructions(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
