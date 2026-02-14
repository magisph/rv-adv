import React, { useState, useEffect } from "react";
import { clientService, processService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Loader2 } from "lucide-react";

const CATEGORIES = {
  receita: {
    honorarios: "Honorários",
    custas_processuais: "Custas Processuais (Reembolso)",
    outros: "Outros",
  },
  despesa: {
    custas_processuais: "Custas Processuais",
    aluguel: "Aluguel",
    salarios: "Salários",
    fornecedores: "Fornecedores",
    impostos: "Impostos",
    outros: "Outros",
  },
};

const PAYMENT_METHODS = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  transferencia: "Transferência",
  cartao: "Cartão",
  boleto: "Boleto",
};

export default function FinancialForm({
  transaction,
  onSave,
  onCancel,
  isSaving,
}) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "receita",
    category: "honorarios",
    status: "pendente",
    client_id: "",
    client_name: "",
    process_id: "",
    process_number: "",
    payment_method: "pix",
    due_date: "",
    paid_date: "",
    ...transaction,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => clientService.list(),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes-list"],
    queryFn: () => processService.list(),
  });

  useEffect(() => {
    if (transaction) {
      setFormData({ ...formData, ...transaction });
    }
  }, [transaction]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.full_name || "",
    }));
  };

  const handleProcessChange = (processId) => {
    const process = processes.find((p) => p.id === processId);
    setFormData((prev) => ({
      ...prev,
      process_id: processId,
      process_number: process?.process_number || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      amount: parseFloat(formData.amount),
    };
    onSave(dataToSave);
  };

  const availableCategories = CATEGORIES[formData.type] || {};

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => handleChange("type", v)}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => handleChange("category", v)}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(availableCategories).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          required
          placeholder="Descreva a transação"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            required
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleChange("status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="client_id">Cliente (opcional)</Label>
          <Select value={formData.client_id} onValueChange={handleClientChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="process_id">Processo (opcional)</Label>
          <Select
            value={formData.process_id}
            onValueChange={handleProcessChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um processo" />
            </SelectTrigger>
            <SelectContent>
              {processes.map((process) => (
                <SelectItem key={process.id} value={process.id}>
                  {process.process_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="payment_method">Forma de Pagamento</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(v) => handleChange("payment_method", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_date">Data de Vencimento</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange("due_date", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}
