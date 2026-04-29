import React, { useState } from "react";
import { toast } from "sonner";
import { processService } from "@/services";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


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
  FolderOpen,
  Edit,
  Trash2,
  Filter,
  Settings,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PjeConfigModal from "@/components/scraper/PjeConfigModal";
import { sincronizarProcessos } from "@/services/scraperService";
import { format } from "date-fns";
import ProcessFormDialog from "@/components/processes/ProcessFormDialog";
import ProcessesChart from "@/components/dashboard/ProcessesChart";
import ConfirmDialog from "@/components/ui/confirm-dialog";

const MotionTableRow = motion.create(TableRow);

const ADVOGADA = { nome: 'Ana Rafaela Vasconcelos Damasceno', oab: '036219', uf: 'CE' };

const STATUS_COLORS = {
  ativo: "bg-green-100 text-green-700 border-green-200",
  arquivado: "bg-slate-100 text-slate-700 border-slate-200",
  suspenso: "bg-amber-100 text-amber-700 border-amber-200",
  encerrado: "bg-red-100 text-red-700 border-red-200",
};

const AREA_LABELS = {
  previdenciario: "Previdenciário",
  civel: "Cível",
  procuradoria_mulher: "Procuradoria da Mulher",
  outros: "Outros",
};

const AREA_COLORS = {
  previdenciario: "bg-blue-100 text-blue-700 border-blue-200",
  civel: "bg-green-100 text-green-700 border-green-200",
  procuradoria_mulher: "bg-purple-100 text-purple-700 border-purple-200",
  outros: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function Processes() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get("client_id");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [showForm, setShowForm] = useState(!!preselectedClientId);
  const [editingProcess, setEditingProcess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showPjeConfig, setShowPjeConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const queryClient = useQueryClient();

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ["processes"],
    queryFn: () => processService.list("-created_at"),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => processService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["processes"] }),
    onError: (error) => toast.error(error.message || "Erro ao excluir processo"),
  });

  const handleEdit = (process) => {
    setEditingProcess(process);
    setShowForm(true);
  };

  const handleDelete = (process) => {
    setDeleteConfirm(process);
  };

  const handleSyncPje = async () => {
    setSyncing(true);
    toast.info('Iniciando robô invisível...', { duration: 4000 });
    try {
      const data = await sincronizarProcessos(ADVOGADA.oab, ADVOGADA.uf);
      toast.success(data.message || 'Extração iniciada com sucesso!');
    } catch (err) {
      toast.error(err.message || 'Falha ao disparar sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredProcesses = processes.filter((process) => {
    const matchesSearch =
      process.process_number?.toLowerCase().includes(search.toLowerCase()) ||
      process.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      process.court?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || process.status === statusFilter;
    const matchesArea = areaFilter === "all" || process.area === areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Processos</h1>
          <p className="text-slate-600">
            {processes.length} processos cadastrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPjeConfig(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar PJe
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncPje}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar PJe
          </Button>
          <Button
            onClick={() => {
              setEditingProcess(null);
              setShowForm(true);
            }}
            className="bg-legal-blue hover:bg-legal-blue-light"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Processo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <Input
                placeholder="Buscar por número, cliente ou tribunal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Áreas</SelectItem>
                  {Object.entries(AREA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Processo</TableHead>
                <TableHead className="hidden md:table-cell">Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">Tribunal</TableHead>
                <TableHead className="hidden lg:table-cell">Área</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-12 bg-slate-100 animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredProcesses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-slate-600"
                  >
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Nenhum processo encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredProcesses.map((process) => (
                    <MotionTableRow
                      key={process.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          to={createPageUrl(`ProcessDetail?id=${process.id}`)}
                          className="block"
                        >
                          <div>
                            <p className="font-medium text-slate-800 font-mono text-sm hover:text-blue-600">
                              {process.process_number}
                            </p>
                            {process.distribution_date && (
                              <p className="text-xs text-slate-600">
                                Dist:{" "}
                                {format(
                                  new Date(process.distribution_date),
                                  "dd/MM/yyyy",
                                )}
                              </p>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-slate-700">{process.client_name}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-slate-600">
                        {process.court}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className={AREA_COLORS[process.area] || "bg-slate-50"}
                        >
                          {AREA_LABELS[process.area] || process.area}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[process.status]}
                        >
                          {process.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(process);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(process);
                              }}
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

      {/* Widget de Processos por Área */}
      <ProcessesChart processes={processes} isLoading={isLoading} />

      {/* Process Form Dialog */}
      <ProcessFormDialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingProcess(null);
        }}
        process={editingProcess}
        preselectedClientId={preselectedClientId}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Excluir processo"
        description={`Deseja realmente excluir o processo "${deleteConfirm?.process_number}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />

      {/* PJe Config Modal */}
      <PjeConfigModal open={showPjeConfig} onOpenChange={setShowPjeConfig} />
    </div>
  );
}
