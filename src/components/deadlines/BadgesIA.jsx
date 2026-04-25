import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, HelpCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BadgeConfiancaIA — Badge visual para exibir o grau de confiança
 * do Motor Híbrido de Classificação Jurídica.
 * 
 * Cores semânticas:
 *   ALTA  → Verde   (classificação confiável, sem bloqueio HITL)
 *   MÉDIA → Amarelo (classificação incerta, aguarda revisão humana)
 *   BAIXA → Vermelho/laranja (classificação muito incerta, HITL obrigatório)
 */
export function BadgeConfiancaIA({ grauConfianca, className }) {
  if (!grauConfianca) return null;

  const config = {
    ALTA: {
      label: "Confiança Alta",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    MÉDIA: {
      label: "Confiança Média",
      icon: HelpCircle,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    BAIXA: {
      label: "Confiança Baixa",
      icon: AlertTriangle,
      className: "bg-orange-50 text-orange-700 border-orange-200",
    },
  };

  const entry = config[grauConfianca];
  if (!entry) return null;

  const Icon = entry.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 text-[10px] py-0.5 px-1.5 font-medium border",
        entry.className,
        className
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {entry.label}
    </Badge>
  );
}

/**
 * BadgeScoreUrgencia — Badge para urgência calculada pela IA.
 */
export function BadgeScoreUrgencia({ scoreUrgencia, ehFatal, className }) {
  if (!scoreUrgencia) return null;

  const config = {
    ALTO: {
      label: ehFatal ? "URGENTE (Fatal)" : "Alta Urgência",
      className: ehFatal
        ? "bg-red-600 text-white border-red-700"
        : "bg-red-50 text-red-700 border-red-200",
    },
    MÉDIO: {
      label: "Urgência Média",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    BAIXO: {
      label: "Baixa Urgência",
      className: "bg-slate-50 text-slate-600 border-slate-200",
    },
  };

  const entry = config[scoreUrgencia];
  if (!entry) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 text-[10px] py-0.5 px-1.5 font-medium border",
        entry.className,
        className
      )}
    >
      {ehFatal && <Zap className="w-3 h-3 shrink-0" />}
      {entry.label}
    </Badge>
  );
}

/**
 * BannerHITL — Banner de aviso HITL para prazos com revisão pendente.
 * Exibido acima de cards que precisam de aprovação manual.
 */
export function BannerHITL({ prazoId, onAprovar, isAprovando }) {
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="text-amber-800 font-medium flex-1">
        Revisão humana obrigatória — Classif. IA com baixa confiança
      </span>
      <button
        type="button"
        disabled={isAprovando}
        onClick={() => onAprovar(prazoId)}
        className={cn(
          "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
          isAprovando
            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
            : "bg-amber-600 text-white hover:bg-amber-700"
        )}
      >
        {isAprovando ? "Aprovando..." : "Aprovar Classificação"}
      </button>
    </div>
  );
}
