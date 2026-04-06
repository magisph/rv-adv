import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  FileText,
  AlertCircle,
  Eye,
  ExternalLink,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  "Benefício Ativo": "bg-green-100 text-green-800 border-green-300",
  "Perícia Agendada": "bg-purple-100 text-purple-800 border-purple-300",
  "Documentos Pendentes": "bg-orange-100 text-orange-800 border-orange-300",
  "Benefício Cessado": "bg-red-100 text-red-800 border-red-300",
  "Benefício Negado": "bg-gray-100 text-gray-800 border-gray-300",
};

const esferaColors = {
  Administrativa: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Judicial: "bg-blue-100 text-blue-800 border-blue-300",
};

export default function PericiaTable({
  pericias,
  isLoading,
  onEdit,
  onDelete,
  onMarkAsSeen,
}) {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      // Parse a data como está no banco (sem conversão de timezone)
      const [year, month, day] = dateString.split("T")[0].split("-");
      return `${day}/${month}/${year}`;
    } catch {
      return "-";
    }
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "-";
    try {
      const [year, month, day] = dateString.split("T")[0].split("-");
      const dateFormatted = `${day}/${month}/${year}`;

      if (timeString) {
        return (
          <div className="flex flex-col">
            <span className="font-medium">{dateFormatted}</span>
            <span className="text-xs text-slate-600">{timeString}</span>
          </div>
        );
      }

      return dateFormatted;
    } catch {
      return "-";
    }
  };

  const formatCPF = (cpf) => {
    if (!cpf) return "-";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return cpf;
  };

  const hasAlert = (pericia) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Verifica alerta DCB — força parse em hora local para evitar off-by-one em UTC-3
    if (pericia.dcb && !pericia.alerta_dcb_exibido) {
      const dcbDate = new Date(pericia.dcb + "T00:00:00");
      const diffDays = Math.ceil((dcbDate - hoje) / (1000 * 60 * 60 * 24));
      if (diffDays <= 15 && diffDays >= 0) return true;
    }

    // Verifica alerta perícia — idem
    if (pericia.data_pericia && pericia.status === "Perícia Agendada") {
      const periciaDate = new Date(pericia.data_pericia + "T00:00:00");
      const diffDays = Math.ceil((periciaDate - hoje) / (1000 * 60 * 60 * 24));
      const alertasExibidos = pericia.alertas_pericia_exibidos || [];

      const diasVerificacao = [90, 60, 45, 30, 15, 10, 7, 5, 3, 2, 1];
      const hasUnreadAlert = diasVerificacao.some((dias) => {
        return (
          diffDays <= dias && diffDays >= 0 && !alertasExibidos.includes(dias)
        );
      });

      if (hasUnreadAlert) return true;
    }

    return false;
  };

  const handleRowClick = (pericia, e) => {
    // Não abrir se clicar nos botões de ação
    if (e.target.closest("button")) {
      return;
    }
    // Redireciona para página de detalhes
    navigate(`/pericias/detalhes/${pericia.id}`);
  };

  return (
    <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <FileText className="w-5 h-5" />
          Lista de Perícias ({pericias.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-semibold text-slate-700 w-12 text-center">
                  Alerta
                </TableHead>
                <TableHead className="font-semibold text-slate-700 min-w-[200px]">
                  Nome
                </TableHead>
                <TableHead className="font-semibold text-slate-700 w-32">
                  CPF
                </TableHead>
                <TableHead className="font-semibold text-slate-700 w-28">
                  Senha INSS
                </TableHead>
                <TableHead className="font-semibold text-slate-700 w-32">
                  Esfera
                </TableHead>
                <TableHead className="font-semibold text-slate-700 w-40">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-slate-700 w-28">
                  DIB
                </TableHead>
                <TableHead className="font-semibold text-slate-700 w-28">
                  DCB
                </TableHead>
                <TableHead className="font-semibold text-slate-700 w-32">
                  Data/Hora Perícia
                </TableHead>
                <TableHead className="font-semibold text-slate-700 min-w-[150px]">
                  Observações
                </TableHead>
                <TableHead className="font-semibold text-slate-700 text-right w-24">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-32 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : pericias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-slate-600">
                      <FileText className="w-12 h-12 opacity-50" />
                      <p className="text-lg font-medium">
                        Nenhuma perícia cadastrada
                      </p>
                      <p className="text-sm">
                        Clique em "Nova Perícia" para começar
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pericias.map((pericia, index) => {
                  const temAlerta = hasAlert(pericia);
                  return (
                    <TableRow
                      key={pericia.id}
                      onClick={(e) => handleRowClick(pericia, e)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                        temAlerta
                          ? "bg-red-50/50 border-l-4 border-l-red-500"
                          : index % 2 === 0
                            ? "bg-slate-50/30"
                            : ""
                      }`}
                    >
                      <TableCell className="text-center">
                        {temAlerta && (
                          <div className="flex items-center justify-center group relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsSeen && onMarkAsSeen(pericia);
                              }}
                              title="Marcar alertas como vistos"
                            >
                              <Eye className="w-5 h-5 text-red-500 animate-pulse hover:text-red-700 hover:animate-none" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        <div className="whitespace-normal">{pericia.nome}</div>
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {formatCPF(pericia.cpf)}
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap font-mono text-sm">
                        {pericia.senha_inss || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${esferaColors[pericia.esfera]} border font-medium`}
                        >
                          {pericia.esfera}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusColors[pericia.status]} border font-medium whitespace-nowrap`}
                        >
                          {pericia.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {formatDate(pericia.dib)}
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {formatDate(pericia.dcb)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDateTime(
                          pericia.data_pericia,
                          pericia.horario_pericia,
                        )}
                      </TableCell>
                      <TableCell>
                        <div
                          className="max-w-xs truncate text-slate-600"
                          title={pericia.observacoes}
                        >
                          {pericia.observacoes || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/pericias/detalhes/${pericia.id}`,
                              );
                            }}
                            className="hover:bg-green-100 hover:text-green-700"
                            title="Ver Detalhes"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(pericia);
                            }}
                            className="hover:bg-blue-100 hover:text-blue-700"
                            title="Editar Rápido"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(pericia.id);
                            }}
                            className="hover:bg-red-100 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
