import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Scale,
  ChevronDown,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import NotificationMonitor from "@/components/notifications/NotificationMonitor";
import InstallButton from "@/components/pwa/InstallButton";
import IOSInstallPrompt from "@/components/pwa/IOSInstallPrompt";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Cache user data com staleTime longo para evitar recarregamentos
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Prefetch estratégico: carregar dados críticos após login
  useEffect(() => {
    if (user && currentPageName === "Home") {
      // Prefetch apenas dados essenciais do dashboard
      queryClient.prefetchQuery({
        queryKey: ["clients"],
        queryFn: () => base44.entities.Client.list("-created_date", 10),
        staleTime: 2 * 60 * 1000,
      });
      queryClient.prefetchQuery({
        queryKey: ["processes"],
        queryFn: () => base44.entities.Process.list("-created_date", 10),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [user, currentPageName, queryClient]);

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, page: "Home" },
    { name: "Clientes", icon: Users, page: "Clients" },
    { name: "Processos", icon: FolderOpen, page: "Processes" },
    { name: "Tarefas", icon: CheckSquare, page: "Tasks" },
    { name: "Templates", icon: FileText, page: "Templates" },
    { name: "Prazos", icon: Calendar, page: "Deadlines" },
    { name: "Financeiro", icon: Settings, page: "Financial" },
  ];

  const handleLogout = async () => {
    // Limpar cache antes de fazer logout
    queryClient.clear();
    await base44.auth.logout();
  };

  // Prefetch ao hover nos links de navegação
  const handleNavHover = (pageName) => {
    if (pageName === "Clients") {
      queryClient.prefetchQuery({
        queryKey: ["clients"],
        queryFn: () => base44.entities.Client.list("-created_date"),
        staleTime: 2 * 60 * 1000,
      });
    } else if (pageName === "Processes") {
      queryClient.prefetchQuery({
        queryKey: ["processes"],
        queryFn: () => base44.entities.Process.list("-created_date"),
        staleTime: 2 * 60 * 1000,
      });
    }
  };

  return (
    <>
      {/* PWA Metadados */}
      <head>
        <meta name="theme-color" content="#1e3a5f" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LegalFlow" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-120.png" />
      </head>

      <div className="min-h-screen bg-slate-50">
        <style>{`
          :root {
            --legal-blue: #1e3a5f;
            --legal-blue-light: #2d5a87;
            --legal-gold: #c9a227;
            --legal-gray: #64748b;
          }
        `}</style>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] text-white h-16 flex items-center justify-between px-4 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-white/10"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#c9a227]" />
            <span className="font-semibold text-lg">LegalFlow</span>
          </div>
          <NotificationBell user={user} />
        </div>

        {/* Sidebar */}
        <aside
          className={`
        fixed top-0 left-0 z-40 h-full w-64 bg-[#1e3a5f] text-white transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
        >
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="h-20 flex items-center justify-center border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#c9a227] rounded-lg flex items-center justify-center">
                  <Scale className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <div>
                  <h1 className="font-bold text-xl tracking-tight">
                    LegalFlow
                  </h1>
                  <p className="text-xs text-slate-300 -mt-1">
                    Gestão Jurídica
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-6">
              <nav className="px-3 space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      onMouseEnter={() => handleNavHover(item.page)}
                      className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${
                        isActive
                          ? "bg-white/15 text-white shadow-lg"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }
                    `}
                    >
                      <item.icon
                        className={`w-5 h-5 ${isActive ? "text-[#c9a227]" : ""}`}
                      />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* User Section */}
            {user && (
              <div className="p-4 border-t border-white/10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#c9a227] flex items-center justify-center text-[#1e3a5f] font-bold">
                        {user.full_name?.charAt(0) ||
                          user.email?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || "Usuário"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl("Settings")}
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Configurações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl("NotificationSettings")}
                        className="flex items-center gap-2"
                      >
                        <Bell className="w-4 h-4" />
                        Notificações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to={createPageUrl("CalendarSettings")}
                        className="flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Google Calendar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Notification Monitor */}
        <NotificationMonitor user={user} />

        {/* PWA Install Button */}
        <InstallButton />

        {/* iOS Install Prompt */}
        <IOSInstallPrompt />

        {/* Main Content */}
        <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
          {/* Desktop Header */}
          <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {navItems.find((i) => i.page === currentPageName)?.name ||
                  currentPageName}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell user={user} />
              {user && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-medium">
                    {user.full_name?.charAt(0) ||
                      user.email?.charAt(0)?.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}

function NotificationBell({ user }) {
  const [showPanel, setShowPanel] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-header", user?.email],
    queryFn: () =>
      base44.entities.Notification.filter({
        user_email: user.email,
        read: false,
      }),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const unreadCount = notifications.length;
  const hasUrgent = notifications.some((n) => n.priority === "urgente");

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-600 hover:text-slate-900 lg:text-slate-600"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell
          className={`w-5 h-5 ${hasUrgent ? "animate-bounce text-red-600" : ""}`}
        />
        {unreadCount > 0 && (
          <Badge
            className={`absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-white text-xs ${
              hasUrgent ? "bg-red-600 animate-pulse" : "bg-blue-600"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {showPanel && (
        <div className="fixed inset-0 z-50" onClick={() => setShowPanel(false)}>
          <div
            className="absolute top-16 right-4 lg:right-8"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationPanel
              user={user}
              onClose={() => setShowPanel(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
