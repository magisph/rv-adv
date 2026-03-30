import React, { useState } from "react";
import { financialService } from "@/services";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Plus,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import FinancialForm from "@/components/financial/FinancialForm";

const STATUS_COLORS = {
  pendente: "bg-amber-100 text-amber-700 border-amber-200",
  pago: "bg-green-100 text-green-700 border-green-200",
  recebido: "bg-green-100 text-green-700 border-green-200",
};

export default function ClientFinancialSection({ clientId, clientName }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["client-financial", clientId],
    queryFn: () => financialService.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => financialService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-financial", clientId]);
      queryClient.invalidateQueries(["all-financial"]);
      setShowForm(false);
    },
  });

  const handleSave = (data) => {
    createMutation.mutate({
      ...data,
      client_id: clientId,
      client_name: clientName,
    });
  };

  const totalReceivable = transactions
    .filter((t) => t.type === "receita" && t.status === "pendente")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalReceived = transactions
    .filter((t) => t.type === "receita" && t.status === "recebido")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const lastPayment = transactions
    .filter((t) => t.status === "pago" || t.status === "recebido")
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const filteredTransactions = transactions
    .filter((t) => {
      if (filter === "all") return true;
      if (filter === "pendentes") return t.status === "pendente";
      if (filter === "pagas")
        return t.status === "pago" || t.status === "recebido";
      if (filter === "vencidas") {
        return (
          t.status === "pendente" &&
          t.due_date &&
          new Date(t.due_date) < new Date()
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-legal-blue" />
            Financeiro
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nova Cobrança
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">A Receber</p>
            <p className="text-lg font-bold text-amber-700">
              {totalReceivable.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Recebido</p>
            <p className="text-lg font-bold text-green-700">
              {totalReceived.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Saldo</p>
            <p className="text-lg font-bold text-blue-700">
              {(totalReceivable + totalReceived).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
        </div>

        {lastPayment && (
          <div className="text-sm text-slate-600">
            Último pagamento: {format(new Date(lastPayment.date), "dd/MM/yyyy")}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={filter === "pendentes" ? "default" : "outline"}
            onClick={() => setFilter("pendentes")}
          >
            Pendentes
          </Button>
          <Button
            size="sm"
            variant={filter === "pagas" ? "default" : "outline"}
            onClick={() => setFilter("pagas")}
          >
            Pagas
          </Button>
          <Button
            size="sm"
            variant={filter === "vencidas" ? "default" : "outline"}
            onClick={() => setFilter("vencidas")}
          >
            Vencidas
          </Button>
        </div>

        {/* Lista de Transações */}
        {isLoading ? (
          <div className="py-8 text-center text-slate-600">Carregando...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-600">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => {
              const isOverdue =
                transaction.status === "pendente" &&
                transaction.due_date &&
                new Date(transaction.due_date) < new Date();

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {transaction.description}
                      </p>
                      {isOverdue && (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-600">
                        {format(new Date(transaction.date), "dd/MM/yyyy")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {transaction.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={`font-medium ${transaction.type === "receita" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "receita" ? "+" : "-"}{" "}
                        {transaction.amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[transaction.status]}`}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Cobrança</DialogTitle>
          </DialogHeader>
          <FinancialForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            isSaving={createMutation.isPending}
            prefilledClient={{ id: clientId, name: clientName }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
