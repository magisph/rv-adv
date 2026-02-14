import React, { useState } from "react";
import { financialService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  DollarSign,
  Calendar,
  PieChart as PieChartIcon,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import FinancialForm from "@/components/financial/FinancialForm";
import FinancialList from "@/components/financial/FinancialList";

const CATEGORY_LABELS = {
  honorarios: "Honorários",
  custas_processuais: "Custas Processuais",
  aluguel: "Aluguel",
  salarios: "Salários",
  fornecedores: "Fornecedores",
  impostos: "Impostos",
  outros: "Outros",
};

const COLORS = [
  "#1e3a5f",
  "#2d5a87",
  "#c9a227",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#64748b",
];

export default function Financial() {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial"],
    queryFn: () => financialService.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => financialService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["financial"]);
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => financialService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["financial"]);
      setShowForm(false);
      setEditingTransaction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => financialService.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["financial"]),
  });

  const handleSave = (data) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = (transaction) => {
    if (confirm(`Deseja excluir a transação "${transaction.description}"?`)) {
      deleteMutation.mutate(transaction.id);
    }
  };

  // Calculate totals
  const totalReceita = transactions
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalDespesa = transactions
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const saldo = totalReceita - totalDespesa;

  const receitaPendente = transactions
    .filter((t) => t.type === "receita" && t.status === "pendente")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const despesaPendente = transactions
    .filter((t) => t.type === "despesa" && t.status === "pendente")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Chart data - by category
  const categoryData = Object.entries(
    transactions.reduce((acc, t) => {
      const cat = t.category || "outros";
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += t.amount || 0;
      return acc;
    }, {}),
  ).map(([name, value]) => ({
    name: CATEGORY_LABELS[name] || name,
    value,
  }));

  // Monthly chart
  const monthlyData = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const receita = transactions
        .filter(
          (t) =>
            t.type === "receita" &&
            isWithinInterval(parseISO(t.date), { start, end }),
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const despesa = transactions
        .filter(
          (t) =>
            t.type === "despesa" &&
            isWithinInterval(parseISO(t.date), { start, end }),
        )
        .reduce((sum, t) => sum + t.amount, 0);

      months.push({
        name: format(date, "MMM", { locale: ptBR }),
        receita,
        despesa,
      });
    }
    return months;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-slate-500">Gestão financeira do escritório</p>
        </div>
        <Button
          onClick={() => {
            setEditingTransaction(null);
            setShowForm(true);
          }}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Receitas</p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {totalReceita.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Despesas</p>
                      <p className="text-2xl font-bold text-red-600">
                        R$ {totalDespesa.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Saldo</p>
                      <p
                        className={`text-2xl font-bold ${saldo >= 0 ? "text-blue-600" : "text-red-600"}`}
                      >
                        R$ {saldo.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">A Receber</p>
                      <p className="text-2xl font-bold text-amber-600">
                        R$ {receitaPendente.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  Fluxo de Caixa (6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) =>
                        `R$ ${value.toLocaleString("pt-BR")}`
                      }
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="receita"
                      fill="#059669"
                      name="Receitas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="despesa"
                      fill="#dc2626"
                      name="Despesas"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          `R$ ${value.toLocaleString("pt-BR")}`
                        }
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-500">
                    <p>Nenhuma transação cadastrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <FinancialList
                transactions={transactions.slice(0, 10)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <FinancialList
                transactions={transactions.filter((t) => t.type === "receita")}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <FinancialList
                transactions={transactions.filter((t) => t.type === "despesa")}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Relatórios Financeiros
                </CardTitle>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">
                    Contas a Receber
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    R$ {receitaPendente.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {
                      transactions.filter(
                        (t) => t.type === "receita" && t.status === "pendente",
                      ).length
                    }{" "}
                    pendências
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Contas a Pagar</p>
                  <p className="text-xl font-bold text-red-600">
                    R$ {despesaPendente.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {
                      transactions.filter(
                        (t) => t.type === "despesa" && t.status === "pendente",
                      ).length
                    }{" "}
                    pendências
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Fluxo Projetado</p>
                  <p
                    className={`text-xl font-bold ${receitaPendente - despesaPendente >= 0 ? "text-blue-600" : "text-red-600"}`}
                  >
                    R${" "}
                    {(receitaPendente - despesaPendente).toLocaleString(
                      "pt-BR",
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Saldo esperado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Editar Transação" : "Nova Transação"}
            </DialogTitle>
          </DialogHeader>
          <FinancialForm
            transaction={editingTransaction}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
