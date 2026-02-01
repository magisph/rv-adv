import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS = {
  pendente: "bg-amber-100 text-amber-700",
  pago: "bg-green-100 text-green-700",
  recebido: "bg-green-100 text-green-700",
};

const CATEGORY_LABELS = {
  honorarios: "Honorários",
  custas_processuais: "Custas",
  aluguel: "Aluguel",
  salarios: "Salários",
  fornecedores: "Fornecedores",
  impostos: "Impostos",
  outros: "Outros",
};

export default function FinancialList({
  transactions,
  onEdit,
  onDelete,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p>Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                transaction.type === "receita" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {transaction.type === "receita" ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-800">
                  {transaction.description}
                </p>
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_LABELS[transaction.category]}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span>{format(new Date(transaction.date), "dd/MM/yyyy")}</span>
                {transaction.client_name && (
                  <>
                    <span>•</span>
                    <span>{transaction.client_name}</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <p
                className={`text-lg font-bold ${
                  transaction.type === "receita"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {transaction.type === "receita" ? "+" : "-"} R${" "}
                {transaction.amount?.toLocaleString("pt-BR")}
              </p>
              <Badge
                variant="outline"
                className={`${STATUS_COLORS[transaction.status]} text-xs`}
              >
                {transaction.status}
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(transaction)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(transaction)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
