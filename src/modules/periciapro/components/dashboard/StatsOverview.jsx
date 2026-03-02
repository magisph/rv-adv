import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";

export default function StatsOverview({ pericias }) {
  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const total = pericias.length;
    const periciaAgendada = pericias.filter(
      (p) => p.status === "Perícia Agendada",
    ).length;
    const beneficioAtivo = pericias.filter(
      (p) => p.status === "Benefício Ativo",
    ).length;
    const documentosPendentes = pericias.filter(
      (p) => p.status === "Documentos Pendentes",
    ).length;

    // Alertas próximos (nos próximos 15 dias)
    let alertasDCB = 0;
    let alertasPericia = 0;

    pericias.forEach((pericia) => {
      if (pericia.dcb) {
        const dcbDate = new Date(pericia.dcb + "T00:00:00");
        const diffDays = Math.ceil((dcbDate - hoje) / (1000 * 60 * 60 * 24));
        if (diffDays <= 15 && diffDays >= 0) alertasDCB++;
      }
      if (pericia.data_pericia && pericia.status === "Perícia Agendada") {
        const periciaDate = new Date(pericia.data_pericia + "T00:00:00");
        const diffDays = Math.ceil(
          (periciaDate - hoje) / (1000 * 60 * 60 * 24),
        );
        if (diffDays <= 15 && diffDays >= 0) alertasPericia++;
      }
    });

    return {
      total,
      periciaAgendada,
      beneficioAtivo,
      documentosPendentes,
      alertasDCB,
      alertasPericia,
    };
  }, [pericias]);

  const statCards = [
    {
      title: "Total de Casos",
      value: stats.total,
      icon: Users,
      bgColor: "from-blue-500 to-blue-600",
      textColor: "text-blue-600",
    },
    {
      title: "Perícias Agendadas",
      value: stats.periciaAgendada,
      icon: Clock,
      bgColor: "from-purple-500 to-purple-600",
      textColor: "text-purple-600",
    },
    {
      title: "Benefícios Ativos",
      value: stats.beneficioAtivo,
      icon: CheckCircle,
      bgColor: "from-green-500 to-green-600",
      textColor: "text-green-600",
    },
    {
      title: "Docs. Pendentes",
      value: stats.documentosPendentes,
      icon: FileText,
      bgColor: "from-orange-500 to-orange-600",
      textColor: "text-orange-600",
    },
    {
      title: "DCB Próximo",
      value: stats.alertasDCB || 0,
      icon: AlertTriangle,
      bgColor: "from-red-500 to-red-600",
      textColor: "text-red-600",
    },
    {
      title: "Perícias Próximas",
      value: stats.alertasPericia || 0,
      icon: Clock,
      bgColor: "from-orange-500 to-orange-600",
      textColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <Card
          key={index}
          className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm"
        >
          <div
            className={`absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 bg-gradient-to-br ${stat.bgColor} rounded-full opacity-10`}
          />
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${stat.bgColor} bg-opacity-10`}
              >
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-600 mb-1">
              {stat.title}
            </p>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
