import React, { useMemo, useState } from "react";
import { periciaService } from "@/modules/periciapro/services/periciaService";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Download,
  FileDown,
  Info,
  Clock,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: pericias = [], isLoading } = useQuery({
    queryKey: ["pericias"],
    queryFn: () => periciaService.list(),
    initialData: [],
  });

  const eventosDoMes = useMemo(() => {
    const eventos = [];

    pericias.forEach((pericia) => {
      // Adiciona DCB ao calendário
      if (pericia.dcb) {
        eventos.push({
          // BUG #6 fix: T00:00:00 prevents off-by-one day in UTC-3 (Brazil)
          data: new Date(pericia.dcb + "T00:00:00"),
          tipo: "dcb",
          titulo: `DCB - ${pericia.nome}`,
          cliente: pericia.nome,
          descricao: "Data de Cessação do Benefício",
          cor: "red",
          pericia: pericia,
        });
      }

      // Adiciona data da perícia ao calendário
      if (pericia.data_pericia && pericia.status === "Perícia Agendada") {
        eventos.push({
          // BUG #6 fix: T00:00:00 prevents off-by-one day in UTC-3 (Brazil)
          data: new Date(pericia.data_pericia + "T00:00:00"),
          tipo: "pericia",
          titulo: `Perícia - ${pericia.nome}`,
          cliente: pericia.nome,
          descricao: "Perícia Agendada",
          cor: "purple",
          pericia: pericia,
        });
      }

      // Adiciona DIB ao calendário
      if (pericia.dib) {
        eventos.push({
          // BUG #6 fix: T00:00:00 prevents off-by-one day in UTC-3 (Brazil)
          data: new Date(pericia.dib + "T00:00:00"),
          tipo: "dib",
          titulo: `DIB - ${pericia.nome}`,
          cliente: pericia.nome,
          descricao: "Data de Início do Benefício",
          cor: "green",
          pericia: pericia,
        });
      }
    });

    return eventos;
  }, [pericias]);

  const diasDoMes = useMemo(() => {
    const inicio = startOfMonth(currentDate);
    const fim = endOfMonth(currentDate);
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [currentDate]);

  const getEventosNoDia = (dia) => {
    return eventosDoMes.filter((evento) => isSameDay(evento.data, dia));
  };

  const proximoMes = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const mesAnterior = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const exportarParaGoogleCalendar = () => {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PeríciasPro//Gestão Previdenciária//PT
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Perícias Previdenciárias
X-WR-TIMEZONE:America/Sao_Paulo
`;

    eventosDoMes.forEach((evento) => {
      const dataFormatada = format(evento.data, "yyyyMMdd");
      const uid = `${dataFormatada}-${evento.tipo}-${evento.cliente.replace(/\s/g, "-")}@pericias.pro`;

      icsContent += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${dataFormatada}
DTEND;VALUE=DATE:${dataFormatada}
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}
UID:${uid}
SUMMARY:${evento.titulo}
DESCRIPTION:${evento.descricao} - Cliente: ${evento.cliente}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-P1D
DESCRIPTION:Lembrete: ${evento.titulo}
ACTION:DISPLAY
END:VALARM
END:VEVENT
`;
    });

    icsContent += `END:VCALENDAR`;

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    // BUG #7 fix: capture the URL so it can be revoked after download to prevent memory leak
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pericias-${format(currentDate, "yyyy-MM")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const eventosNoDiaSelecionado = selectedDate
    ? getEventosNoDia(selectedDate)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              Calendário de Perícias
            </h1>
            <p className="text-slate-600 mt-1">
              Visualize todas as datas importantes em um só lugar
            </p>
          </div>
          <Button
            onClick={exportarParaGoogleCalendar}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar para Calendário
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                DIB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-900">
                {eventosDoMes.filter((e) => e.tipo === "dib").length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700">
                DCB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-900">
                {eventosDoMes.filter((e) => e.tipo === "dcb").length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                Perícias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-900">
                {eventosDoMes.filter((e) => e.tipo === "pericia").length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-900">
                {eventosDoMes.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold text-slate-900">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR }).replace(
                      /^\w/,
                      (c) => c.toUpperCase(),
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={mesAnterior}>
                      ←
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      Hoje
                    </Button>
                    <Button variant="outline" size="sm" onClick={proximoMes}>
                      →
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (dia) => (
                      <div
                        key={dia}
                        className="text-center text-xs font-semibold text-slate-600 py-2"
                      >
                        {dia}
                      </div>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {/* Dias vazios antes do início do mês */}
                  {Array.from({ length: diasDoMes[0].getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {/* Dias do mês */}
                  {diasDoMes.map((dia) => {
                    const eventos = getEventosNoDia(dia);
                    const ehHoje = isToday(dia);
                    const ehSelecionado =
                      selectedDate && isSameDay(dia, selectedDate);

                    return (
                      <button
                        key={dia.toISOString()}
                        onClick={() => setSelectedDate(dia)}
                        className={`aspect-square p-1 rounded-lg text-sm transition-all hover:bg-blue-50 ${
                          ehHoje
                            ? "bg-blue-600 text-white font-bold hover:bg-blue-700"
                            : ""
                        } ${ehSelecionado ? "ring-2 ring-blue-500" : ""} ${
                          eventos.length > 0 && !ehHoje
                            ? "bg-slate-100 font-semibold"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span>{format(dia, "d")}</span>
                          {eventos.length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {eventos.slice(0, 3).map((evento, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    evento.cor === "red"
                                      ? "bg-red-500"
                                      : evento.cor === "purple"
                                        ? "bg-purple-500"
                                        : evento.cor === "green"
                                          ? "bg-green-500"
                                          : "bg-blue-500"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Eventos do dia selecionado */}
          <div>
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="text-lg font-bold text-slate-900">
                  {selectedDate
                    ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                    : "Selecione um dia"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {eventosNoDiaSelecionado.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {selectedDate
                        ? "Nenhum evento neste dia"
                        : "Clique em um dia para ver os eventos"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventosNoDiaSelecionado.map((evento, i) => (
                      <Card
                        key={i}
                        className={`border-2 ${
                          evento.cor === "red"
                            ? "border-red-300 bg-red-50"
                            : evento.cor === "purple"
                              ? "border-purple-300 bg-purple-50"
                              : evento.cor === "green"
                                ? "border-green-300 bg-green-50"
                                : "border-blue-300 bg-blue-50"
                        }`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-slate-900 text-sm">
                              {evento.titulo}
                            </h4>
                            <Badge
                              className={`${
                                evento.cor === "red"
                                  ? "bg-red-200 text-red-800"
                                  : evento.cor === "purple"
                                    ? "bg-purple-200 text-purple-800"
                                    : evento.cor === "green"
                                      ? "bg-green-200 text-green-800"
                                      : "bg-blue-200 text-blue-800"
                              } text-xs`}
                            >
                              {evento.tipo.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">
                            {evento.descricao}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>
                              {format(evento.data, "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legenda */}
            <Card className="border-none shadow-lg bg-white/90 backdrop-blur-sm mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Legenda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-slate-700">
                    DIB - Início do Benefício
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-700">
                    DCB - Cessação do Benefício
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-slate-700">Perícia Agendada</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Informações sobre integração */}
        <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <FileDown className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-slate-700">
            <strong>Integração com Calendários:</strong> Use o botão "Exportar
            para Calendário" para baixar um arquivo .ics compatível com Google
            Calendar, Outlook, Apple Calendar e outros aplicativos de
            calendário. Basta importar o arquivo no seu aplicativo preferido
            para sincronizar todos os eventos.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
