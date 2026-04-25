import React from "react";
import { useAuth } from "@/lib/AuthContext";
import PainelDJEN from "@/components/djen/PainelDJEN";
import { PainelHITL } from "@/components/deadlines/PainelHITL";

// ─── Página Principal ──────────────────────────────────────────────────────
export default function IntimacoesDJEN() {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || user?.app_metadata?.role?.toLowerCase() || "";

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">DJEN Oficial</h1>
        <p className="text-slate-600">
          Intimações e publicações do Diário de Justiça Eletrônico Nacional
        </p>
      </div>

      {/* 🔴 Painel HITL — aparece apenas quando há prazos aguardando revisão */}
      <PainelHITL userRole={userRole} />

      {/* Painel principal de comunicações DJEN */}
      <PainelDJEN />
    </div>
  );
}
