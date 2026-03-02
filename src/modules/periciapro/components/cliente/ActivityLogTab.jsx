import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  Plus,
} from "lucide-react";

export default function ActivityLogTab({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Nenhuma atividade registrada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case "status_change":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "payment":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case "document":
        return <FileText className="w-4 h-4 text-orange-500" />;
      case "reminder":
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case "creation":
        return <Plus className="w-4 h-4 text-slate-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm"
        >
          <div className="mt-1">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
              {getIcon(log.type)}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              {log.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">
                {(() => {
                  const date = new Date(log.created_date);
                  const optionsDate = {
                    timeZone: "America/Fortaleza",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  };
                  const optionsTime = {
                    timeZone: "America/Fortaleza",
                    hour: "2-digit",
                    minute: "2-digit",
                  };
                  return `${new Intl.DateTimeFormat("pt-BR", optionsDate).format(date)} às ${new Intl.DateTimeFormat("pt-BR", optionsTime).format(date)}`;
                })()}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">{log.created_by}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
