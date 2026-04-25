import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deadlineService } from "@/services/deadlineService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import {
  BadgeConfiancaIA,
  BadgeScoreUrgencia,
  BannerHITL,
} from "@/components/deadlines/BadgesIA";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * PainelHITL — Componente de aviso para prazos aguardando revisão humana.
 * Pode ser embutido em diversas telas (Tasks, DJEN, Dashboard).
 */
export function PainelHITL({ userRole }) {
  const queryClient = useQueryClient();

  // Só exibe o painel para advogado e admin
  const podeAprovar = ["admin", "advogado", "dono"].includes(userRole?.toLowerCase());

  const { data: prazosHITL = [], isLoading } = useQuery({
    queryKey: ["deadlines-hitl-pendentes"],
    queryFn: () => deadlineService.listPendingHITL(),
    refetchInterval: 60_000, // Refresh automático a cada 60s
    enabled: podeAprovar,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => deadlineService.approveDeadline(id),
    onSuccess: (prazo) => {
      queryClient.invalidateQueries({ queryKey: ["deadlines-hitl-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      toast.success(`Prazo "${prazo?.titulo || "prazo"}" aprovado com sucesso`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao aprovar classificação");
    },
  });

  if (!podeAprovar) return null;
  if (isLoading) return null;
  if (prazosHITL.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/50 shadow-sm mb-6">
      <CardHeader className="pb-3 pt-4 px-5 border-b border-amber-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <CardTitle className="text-base font-bold text-amber-900">
              Prazos Aguardando Revisão Humana
            </CardTitle>
          </div>
          <Badge className="bg-amber-600 text-white text-xs font-bold px-2 py-1">
            {prazosHITL.length} pendente{prazosHITL.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-xs text-amber-700 mt-1">
          O Motor de IA classificou estes prazos com baixa confiança.
          Revise e aprove cada classificação antes que integrem a fila de prazos definitiva.
        </p>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {prazosHITL.map((prazo) => (
          <div
            key={prazo.id}
            className="bg-white border border-amber-200 rounded-lg p-3 space-y-2"
          >
            {/* Cabeçalho do prazo */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">
                  {prazo.titulo}
                </p>
                {prazo.due_date && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vencimento:{" "}
                    {format(new Date(prazo.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>

              {/* Badges de classificação IA */}
              <div className="flex flex-wrap gap-1 shrink-0">
                <BadgeScoreUrgencia
                  scoreUrgencia={prazo.score_urgencia}
                  ehFatal={prazo.eh_fatal}
                />
                <BadgeConfiancaIA grauConfianca={prazo.grau_confianca} />
              </div>
            </div>

            {/* Descrição reduzida */}
            {prazo.descricao && (
              <p className="text-xs text-slate-600 line-clamp-2">
                {prazo.descricao}
              </p>
            )}

            {/* Banner HITL com botão de aprovação */}
            <BannerHITL
              prazoId={prazo.id}
              onAprovar={(id) => approveMutation.mutate(id)}
              isAprovando={
                approveMutation.isPending &&
                approveMutation.variables === prazo.id
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
