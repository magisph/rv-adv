import React, { useMemo, useState } from "react";
import { periciaService } from "@/modules/periciapro/services/periciaService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GoogleCalendarButton from "../components/calendar/GoogleCalendarButton";

export default function Alertas() {
  const queryClient = useQueryClient();
  // BUG #5 fix: state for error feedback on marcarComoVisto failure
  const [marcarErro, setMarcarErro] = useState("");

  const { data: pericias = [], isLoading } = useQuery({
    queryKey: ["pericias"],
    queryFn: () => periciaService.list(),
    initialData: [],
  });

  const marcarComoVistoMutation = useMutation({
    mutationFn: ({ id, tipo, dias }) => {
      const pericia = pericias.find((p) => p.id === id);
      if (!pericia) return Promise.reject("Perícia não encontrada");

      if (tipo === "dcb") {
        return periciaService.update(id, {
          alerta_dcb_exibido: true,
        });
      } else if (tipo === "pericia") {
        const alertasExibidos = pericia.alertas_pericia_exibidos || [];
        return periciaService.update(id, {
          alertas_pericia_exibidos: [...alertasExibidos, dias],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pericias"] });
      setMarcarErro("");
    },
    // BUG #5 fix: feedback visual quando a atualização falha
    onError: (error) => {
      console.error("[Alertas] Falha ao marcar como visto:", error);
      setMarcarErro("Não foi possível marcar o alerta. Tente novamente.");
    },
  });

  const alertas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const listaAlertas = [];

    pericias.forEach((pericia) => {
      // Alertas de DCB (15 dias antes)
      if (pericia.dcb && !pericia.alerta_dcb_exibido) {
        const dcbDate = new Date(pericia.dcb + "T00:00:00");
        const diasRestantes = Math.ceil(
          (dcbDate - hoje) / (1000 * 60 * 60 * 24),
        );

        // Somente mostrar se ainda não passou a data E está dentro do intervalo de alerta
        if (diasRestantes <= 15 && diasRestantes >= 0) {
          listaAlertas.push({
            id: pericia.id,
            tipo: "dcb",
            titulo: "Data de Cessação do Benefício se aproxima",
            descricao: `O benefício de ${pericia.nome} será cessado em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`,
            data: pericia.dcb,
            diasRestantes,
            cliente: pericia.nome,
            cpf: pericia.cpf,
            prioridade:
              diasRestantes <= 5
                ? "alta"
                : diasRestantes <= 10
                  ? "media"
                  : "baixa",
            pericia: pericia,
          });
        }
      }

      // Alertas de Perícia
      if (pericia.data_pericia && pericia.status === "Perícia Agendada") {
        let periciaDateStr = pericia.data_pericia;
        if (pericia.horario_pericia) {
          periciaDateStr += `T${pericia.horario_pericia}:00`;
        } else {
          periciaDateStr += "T00:00:00";
        }
        const periciaDate = new Date(periciaDateStr);

        // Usar hora atual para cálculo preciso
        const agora = new Date();
        const diasRestantes = Math.ceil(
          (periciaDate - agora) / (1000 * 60 * 60 * 24),
        );
        const alertasExibidos = pericia.alertas_pericia_exibidos || [];

        // BUG #4 fix: use find (sorted ascending) to get only the SINGLE most urgent
        // unseen threshold, avoiding N duplicate cards for the same perícia.
        const diasVerificacao = [90, 60, 45, 30, 15, 10, 7, 5, 3, 2, 1];
        const diaAtivo = [...diasVerificacao]
          .sort((a, b) => a - b) // ascending: 1,2,3,5,7,10,...
          .find(
            (dias) =>
              diasRestantes <= dias &&
              diasRestantes >= 0 &&
              !alertasExibidos.includes(dias),
          );

        if (diaAtivo !== undefined) {
          listaAlertas.push({
            id: pericia.id,
            tipo: "pericia",
            dias: diaAtivo,
            titulo: `Perícia agendada em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`,
            descricao: `Perícia de ${pericia.nome} está prevista para ${format(new Date(pericia.data_pericia + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}${pericia.horario_pericia ? ` às ${pericia.horario_pericia}` : ""}`,
            data: pericia.data_pericia,
            horario: pericia.horario_pericia,
            diasRestantes,
            cliente: pericia.nome,
            cpf: pericia.cpf,
            prioridade:
              diasRestantes <= 1
                ? "alta"
                : diasRestantes <= 15
                  ? "media"
                  : "baixa",
            pericia: pericia,
          });
        }
      }
    });

    // Ordena por prioridade e dias restantes
    return listaAlertas.sort((a, b) => {
      const prioridadeOrdem = { alta: 0, media: 1, baixa: 2 };
      if (prioridadeOrdem[a.prioridade] !== prioridadeOrdem[b.prioridade]) {
        return prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade];
      }
      return a.diasRestantes - b.diasRestantes;
    });
  }, [pericias]);

  const handleMarcarComoVisto = (alerta) => {
    marcarComoVistoMutation.mutate({
      id: alerta.id,
      tipo: alerta.tipo,
      dias: alerta.dias,
    });
  };

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case "alta":
        return "bg-red-100 border-red-300 text-red-800";
      case "media":
        return "bg-orange-100 border-orange-300 text-orange-800";
      case "baixa":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getPrioridadeIcon = (prioridade) => {
    switch (prioridade) {
      case "alta":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "media":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "baixa":
        return <Bell className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              Sistema de Alertas
            </h1>
            <p className="text-slate-600 mt-1">
              Acompanhe prazos importantes de DCB e perícias agendadas
            </p>
          </div>
          <Badge className="bg-blue-600 text-white text-lg px-4 py-2">
            {alertas.length}{" "}
            {alertas.length === 1 ? "Alerta Ativo" : "Alertas Ativos"}
          </Badge>
        </div>

        {/* BUG #5 fix: feedback de erro ao marcar como visto */}
        {marcarErro && (
          <Alert className="bg-red-50 border-red-300">
            <AlertDescription className="text-red-800">{marcarErro}</AlertDescription>
          </Alert>
        )}

        {/* Resumo de Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alta Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-900">
                {alertas.filter((a) => a.prioridade === "alta").length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Média Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-900">
                {alertas.filter((a) => a.prioridade === "media").length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Baixa Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-900">
                {alertas.filter((a) => a.prioridade === "baixa").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Alertas */}
        <div className="space-y-4">
          {alertas.length === 0 ? (
            <Card className="border-none shadow-lg bg-white/90 backdrop-blur-sm">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4 text-slate-600">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Nenhum Alerta Ativo
                    </h3>
                    <p className="text-slate-600">
                      Todos os prazos estão sob controle. Continue monitorando!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            alertas.map((alerta, index) => (
              <Card
                key={`${alerta.id}-${alerta.tipo}-${index}`}
                className={`border-2 ${getPrioridadeColor(alerta.prioridade)} shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getPrioridadeIcon(alerta.prioridade)}
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900">
                          {alerta.titulo}
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          {alerta.descricao}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={`${getPrioridadeColor(alerta.prioridade)} border font-semibold`}
                    >
                      {alerta.prioridade.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Cliente</p>
                        <p className="font-semibold text-slate-900">
                          {alerta.cliente}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Data</p>
                        <p className="font-semibold text-slate-900">
                          {format(new Date(alerta.data), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                          {alerta.horario && ` às ${alerta.horario}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Dias Restantes</p>
                        <p className="font-semibold text-slate-900">
                          {alerta.diasRestantes}{" "}
                          {alerta.diasRestantes === 1 ? "dia" : "dias"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-xs text-blue-800">
                      <strong>Tipo de Alerta:</strong>{" "}
                      {alerta.tipo === "dcb"
                        ? "Cessação de Benefício (DCB)"
                        : `Perícia Agendada (Alerta de ${alerta.dias} dias)`}
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-2">
                    {alerta.tipo === "pericia" && (
                      <GoogleCalendarButton
                        title={alerta.cliente}
                        date={alerta.data}
                        time={alerta.horario}
                        details={`Perícia de ${alerta.cliente} (CPF: ${alerta.cpf}).\nLocal: ${alerta.pericia.local_pericia || "Não informado"}\nObservações: ${alerta.pericia.observacoes || ""}`}
                        location={alerta.pericia.local_pericia}
                      />
                    )}
                    <Button
                      onClick={() => handleMarcarComoVisto(alerta)}
                      disabled={marcarComoVistoMutation.isPending}
                      variant="outline"
                      className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar como Visto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Informações sobre o Sistema */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Bell className="w-5 h-5 text-blue-600" />
              Como Funciona o Sistema de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Alerta de DCB:</strong> Um alerta é gerado
                automaticamente 15 dias antes da Data de Cessação do Benefício.
              </p>
            </div>
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Alertas de Perícia:</strong> Múltiplos alertas são
                gerados em 45, 30, 15 e 1 dia antes da data da perícia agendada.
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Priorização:</strong> Alertas são classificados por
                prioridade (alta, média, baixa) baseado na proximidade da data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
