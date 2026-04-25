import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { processSchema } from "@/lib/validation/schemas/processSchema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { processService, clientService } from "@/services";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Save, X } from "lucide-react";

const AREAS = {
  previdenciario: "Previdenciário",
  civel: "Cível",
  procuradoria_mulher: "Procuradoria da Mulher",
  outros: "Outros",
};

export default function ProcessFormDialog({
  open,
  onOpenChange,
  process = null,
  preselectedClientId = null,
  preselectedClientName = "",
}) {
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => clientService.list(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(processSchema),
    defaultValues: {
      process_number: "",
      client_id: preselectedClientId || "",
      client_name: preselectedClientName || "",
      court: "",
      subject: "",
      case_value: 0,
      status: "ativo",
      distribution_date: "",
      area: "previdenciario",
    },
  });

  useEffect(() => {
    if (open) {
      if (process) {
        reset({
          ...process,
          client_id: process.client_id || preselectedClientId || "",
          client_name: process.client_name || preselectedClientName || "",
          case_value: process.case_value || 0,
          court: process.court || "",
          subject: process.subject || "",
          distribution_date: process.distribution_date || "",
        });
      } else {
        reset({
          process_number: "",
          client_id: preselectedClientId || "",
          client_name: preselectedClientName || "",
          court: "",
          subject: "",
          case_value: 0,
          status: "ativo",
          distribution_date: "",
          area: "previdenciario",
        });
      }
    }
  }, [open, process, preselectedClientId, preselectedClientName, reset]);

  const selectedClientId = watch("client_id");

  useEffect(() => {
    if (selectedClientId && clients.length > 0) {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        setValue("client_name", client.full_name, { shouldValidate: true });
        if (!process) {
          setValue("area", client.area_atuacao === "Cível" ? "civel" : "previdenciario", { shouldValidate: true });
        }
      }
    }
  }, [selectedClientId, clients, setValue, process]);

  const mutation = useMutation({
    mutationFn: (data) =>
      process ? processService.update(process.id, data) : processService.create(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      if (variables.client_id) {
        queryClient.invalidateQueries({ queryKey: ["client-processes", variables.client_id] });
      }
      if (process?.id) {
        queryClient.invalidateQueries({ queryKey: ["process", process.id] });
      }
      toast.success(process ? "Processo atualizado com sucesso!" : "Processo criado com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar processo");
    },
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{process ? "Editar Processo" : "Novo Processo"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="process_number">Número do Processo (CNJ) *</Label>
              <Input
                id="process_number"
                {...register("process_number")}
                placeholder="0000000-00.0000.0.00.0000"
                className="font-mono"
              />
              {errors.process_number && (
                <p className="text-sm text-red-500">{errors.process_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select
                value={watch("client_id")}
                onValueChange={(val) => setValue("client_id", val, { shouldValidate: true })}
                disabled={!!preselectedClientId}
              >
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
              {errors.client_id && (
                <p className="text-sm text-red-500">{errors.client_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="court">Tribunal/Vara</Label>
              <Input
                id="court"
                {...register("court")}
                placeholder="Ex: 1ª Vara Federal de São Paulo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área do Direito *</Label>
              <Select
                value={watch("area")}
                onValueChange={(val) => setValue("area", val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AREAS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.area && (
                <p className="text-sm text-red-500">{errors.area.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="case_value">Valor da Causa (R$)</Label>
              <Input
                id="case_value"
                type="number"
                step="0.01"
                {...register("case_value")}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distribution_date">Data de Distribuição</Label>
              <Input
                id="distribution_date"
                type="date"
                {...register("distribution_date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(val) => setValue("status", val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto/Objeto</Label>
            <Textarea
              id="subject"
              {...register("subject")}
              placeholder="Descreva o assunto ou objeto do processo"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-legal-blue hover:bg-legal-blue-light"
            >
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Salvando..." : "Salvar Processo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
