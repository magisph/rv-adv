import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = {
  previdenciario: "#1e3a5f",
  trabalhista: "#2d5a87",
  civil: "#c9a227",
  criminal: "#dc2626",
  familia: "#7c3aed",
  tributario: "#059669",
  outros: "#64748b",
};

const LABELS = {
  previdenciario: "Previdenciário",
  trabalhista: "Trabalhista",
  civil: "Civil",
  criminal: "Criminal",
  familia: "Família",
  tributario: "Tributário",
  outros: "Outros",
};

export default function ProcessesChart({ processes = [], isLoading }) {
  const chartData = React.useMemo(() => {
    const grouped = processes.reduce((acc, process) => {
      const area = process.area || "outros";
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name: LABELS[name] || name,
      value,
      color: COLORS[name] || COLORS.outros,
    }));
  }, [processes]);

  const totalActive = processes.filter((p) => p.status === "ativo").length;

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-800">
          Processos por Área
        </CardTitle>
        <p className="text-sm text-slate-600">{totalActive} processos ativos</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-600">
            Nenhum processo cadastrado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} processos`, ""]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-slate-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
