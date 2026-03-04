import React, { useState } from "react";
import { toast } from "sonner";
import { clientService } from "@/services";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  User,
  Phone,
  Edit,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ClientForm from "@/components/clients/ClientForm";
import ClientsChart from "@/components/dashboard/ClientsChart";
import ConfirmDialog from "@/components/ui/confirm-dialog";

const MotionTableRow = motion.create(TableRow);

const STATUS_COLORS = {
  ativo: "bg-green-100 text-green-700 border-green-200",
  inativo: "bg-slate-100 text-slate-700 border-slate-200",
  processo_andamento: "bg-blue-100 text-blue-700 border-blue-200",
  processo_concluido: "bg-green-200 text-green-800 border-green-300",
  prospecto: "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_LABELS = {
  ativo: "Ativo",
  inativo: "Inativo",
  processo_andamento: "Processo em Andamento",
  processo_concluido: "Processo Concluído",
  prospecto: "Prospecto",
};

export default function Clients() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.list("-created_at"),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data) => clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
    },
    onError: (error) => toast.error(error.message || "Erro ao criar cliente"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => clientService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowForm(false);
      setEditingClient(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar cliente"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => clientService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
    onError: (error) => toast.error(error.message || "Erro ao excluir cliente"),
  });

  const handleSave = (data) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = (client) => {
    setDeleteConfirm(client);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      client.cpf_cnpj?.includes(search) ||
      client.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500">
            {clients.length} clientes cadastrados
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            setShowForm(true);
          }}
          className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Senha INSS
                </TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-12 bg-slate-100 animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-slate-500"
                  >
                    <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Nenhum cliente encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredClients.map((client) => (
                    <MotionTableRow
                      key={client.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                        <TableCell>
                          <Link
                            to={createPageUrl(`ClientDetail?id=${client.id}`)}
                            className="flex items-center gap-3"
                          >
                            <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-medium">
                              {client.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {client.full_name}
                              </p>
                              <p className="text-sm text-slate-500 md:hidden">
                                {client.cpf_cnpj}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-slate-600">
                          {client.cpf_cnpj}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.senha_meu_inss ? (
                            <span className="text-sm text-slate-600 font-mono">
                              {client.senha_meu_inss}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400 italic">
                              Não informada
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.phone && (
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Phone className="w-3 h-3" />
                              {client.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_COLORS[client.status]}
                          >
                            {STATUS_LABELS[client.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(client)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(client)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </MotionTableRow>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Widget de Novos Clientes */}
      <ClientsChart clients={clients} isLoading={isLoading} />

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <ClientForm
            client={editingClient}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingClient(null);
            }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir cliente"
        description={`Deseja realmente excluir o cliente "${deleteConfirm?.full_name}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
