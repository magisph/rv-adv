import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Save,
  X,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clientService } from "@/services/clientService";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PericiaModal({
  isOpen,
  onClose,
  onSave,
  pericia,
  isLoading,
}) {
  const estadoInicial = {
    client_id: null,
    senha_inss: "",
    esfera: "Administrativa",
    status: "Benefício Ativo",
    documentos_pendentes: "",
    dib: "",
    dcb: "",
    data_pericia: "",
    horario_pericia: "",
    local_pericia: "",
    observacoes: "",
    alerta_dcb_exibido: false,
    alertas_pericia_exibidos: [],
    pagamentos: [],
  };

  const [formData, setFormData] = useState(estadoInicial);

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPagamentos, setShowPagamentos] = useState(false);
  
  const [clientes, setClientes] = useState([]);
  const [openClientCombo, setOpenClientCombo] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let timeoutId;
    async function loadClients() {
      setIsLoadingClients(true);
      try {
        let res = [];
        if (!searchTerm) {
          res = await clientService.listAtivos('-created_at', 30);
        } else {
          res = await clientService.searchByName(searchTerm, 30);
        }
        
        setClientes(res.map(c => ({
            id: c.id,
            label: `${c.full_name || 'Sem nome'} ${c.cpf_cnpj ? `(${c.cpf_cnpj})` : ''}`,
            value: c.id,
            raw: c
        })));
      } catch (err) {
        console.error("Erro ao carregar clientes", err);
      } finally {
        setIsLoadingClients(false);
      }
    }
    
    timeoutId = setTimeout(() => {
      loadClients();
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [isOpen, searchTerm]);

  // Garante que o cliente da perícia já existente não seja perdido se não vier nas 30 top
  useEffect(() => {
    if (pericia?.client_id && pericia?.clients && clientes.length > 0) {
      setClientes(prev => {
        const exists = prev.find(c => c.value === pericia.client_id);
        if (exists) return prev;
        return [
          {
            id: pericia.clients.id,
            label: `${pericia.clients.full_name || 'Sem nome'} ${pericia.clients.cpf_cnpj ? `(${pericia.clients.cpf_cnpj})` : ''}`,
            value: pericia.clients.id,
            raw: pericia.clients
          },
          ...prev
        ];
      });
    }
  }, [pericia, openClientCombo]);

  useEffect(() => {
    if (pericia) {
      setFormData({
        client_id: pericia.client_id || null,
        senha_inss: pericia.senha_inss || "",
        esfera: pericia.esfera || "Administrativa",
        status: pericia.status || "Benefício Ativo",
        documentos_pendentes: pericia.documentos_pendentes || "",
        dib: pericia.dib || "",
        dcb: pericia.dcb || "",
        data_pericia: pericia.data_pericia || "",
        horario_pericia: pericia.horario_pericia || "",
        local_pericia: pericia.local_pericia || "",
        observacoes: pericia.observacoes || "",
        alerta_dcb_exibido: pericia.alerta_dcb_exibido || false,
        alertas_pericia_exibidos: pericia.alertas_pericia_exibidos || [],
        pagamentos: pericia.pagamentos || [],
      });
    } else {
      setFormData(estadoInicial);
    }
    setErrors({});
    setShowPagamentos(false);
  }, [pericia, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const adicionarPagamento = () => {
    setFormData((prev) => ({
      ...prev,
      pagamentos: [
        ...prev.pagamentos,
        {
          valor: 0,
          data: "",
          status: "pendente",
          observacao: "",
        },
      ],
    }));
  };

  const removerPagamento = (index) => {
    setFormData((prev) => ({
      ...prev,
      pagamentos: prev.pagamentos.filter((_, i) => i !== index),
    }));
  };

  const atualizarPagamento = (index, campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      pagamentos: prev.pagamentos.map((pag, i) =>
        i === index ? { ...pag, [campo]: valor } : pag,
      ),
    }));
  };

  const calcularTotalPagamentos = () => {
    return formData.pagamentos.reduce(
      (total, pag) => total + (Number(pag.valor) || 0),
      0,
    );
  };

  const calcularPagamentosRealizados = () => {
    return formData.pagamentos
      .filter((pag) => pag.status === "pago")
      .reduce((total, pag) => total + (Number(pag.valor) || 0), 0);
  };

  const calcularPagamentosPendentes = () => {
    return formData.pagamentos
      .filter((pag) => pag.status === "pendente")
      .reduce((total, pag) => total + (Number(pag.valor) || 0), 0);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.client_id) {
      newErrors.client_id = "Selecione um cliente";
    }

    if (
      formData.status === "Documentos Pendentes" &&
      !formData.documentos_pendentes.trim()
    ) {
      newErrors.documentos_pendentes =
        "Especifique quais documentos estão pendentes";
    }

    if (formData.status === "Perícia Agendada") {
      if (!formData.data_pericia) {
        newErrors.data_pericia =
          'Data da perícia é obrigatória quando status é "Perícia Agendada"';
      }
      if (!formData.horario_pericia) {
        newErrors.horario_pericia =
          'Horário da perícia é obrigatório quando status é "Perícia Agendada"';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Converte strings vazias em null para campos que exigem tipos estritos
   * no PostgREST (uuid, date). Evita HTTP 400 Bad Request.
   */
  const sanitizeParaEnvio = (payload) =>
    Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v]),
    );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const dataToSave = { ...formData };

    // Enriquece com nome/CPF denormalizados para legibilidade
    if (dataToSave.client_id) {
      const clienteLog = clientes.find((c) => c.value === dataToSave.client_id);
      if (clienteLog?.raw) {
        dataToSave.nome = clienteLog.raw.full_name;
        dataToSave.cpf = clienteLog.raw.cpf_cnpj;
      }
    }

    // Limpa campos condicionais que não se aplicam ao status atual
    if (formData.status !== 'Documentos Pendentes') {
      dataToSave.documentos_pendentes = null;
    }
    if (formData.status !== 'Perícia Agendada') {
      dataToSave.data_pericia = null;
      dataToSave.horario_pericia = null;
      dataToSave.local_pericia = null;
    }

    // Sanitização final: strings vazias → null (tipo-seguro para PostgREST)
    onSave(sanitizeParaEnvio(dataToSave));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {pericia ? "Editar Perícia" : "Nova Perícia"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Informações do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
              Informações do Cliente
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col justify-end">
                <Label htmlFor="cliente">Cliente Vinculado *</Label>
                <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openClientCombo}
                      className={cn(
                        "w-full justify-between",
                        errors.client_id && "border-red-500",
                        !formData.client_id && "text-muted-foreground"
                      )}
                    >
                      {formData.client_id
                        ? clientes.find((c) => c.value === formData.client_id)?.label
                        : isLoadingClients
                        ? "Carregando clientes..."
                        : "Selecione o Cliente..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Pesquisar cliente por nome ou CPF..." 
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clientes.map((cliente) => (
                            <CommandItem
                              key={cliente.value}
                              value={cliente.label}
                              onSelect={() => {
                                handleChange("client_id", cliente.value);
                                setOpenClientCombo(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.client_id === cliente.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {cliente.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.client_id && (
                  <p className="text-sm text-red-500 text-left mt-1">{errors.client_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha_inss">Senha INSS</Label>
                <div className="relative">
                  <Input
                    id="senha_inss"
                    type={showPassword ? "text" : "password"}
                    value={formData.senha_inss}
                    onChange={(e) => handleChange("senha_inss", e.target.value)}
                    placeholder="Senha do cliente no INSS"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Processo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
              Informações do Processo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="esfera">Esfera *</Label>
                <Select
                  value={formData.esfera}
                  onValueChange={(value) => handleChange("esfera", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrativa">
                      Administrativa
                    </SelectItem>
                    <SelectItem value="Judicial">Judicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Benefício Ativo">
                      Benefício Ativo
                    </SelectItem>
                    <SelectItem value="Perícia Agendada">
                      Perícia Agendada
                    </SelectItem>
                    <SelectItem value="Documentos Pendentes">
                      Documentos Pendentes
                    </SelectItem>
                    <SelectItem value="Benefício Cessado">
                      Benefício Cessado
                    </SelectItem>
                    <SelectItem value="Benefício Negado">
                      Benefício Negado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === "Documentos Pendentes" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="documentos_pendentes">
                    Documentos Pendentes *
                  </Label>
                  <Textarea
                    id="documentos_pendentes"
                    value={formData.documentos_pendentes}
                    onChange={(e) =>
                      handleChange("documentos_pendentes", e.target.value)
                    }
                    placeholder="Especifique quais documentos estão pendentes..."
                    rows={3}
                    className={
                      errors.documentos_pendentes ? "border-red-500" : ""
                    }
                  />
                  {errors.documentos_pendentes && (
                    <p className="text-sm text-red-500">
                      {errors.documentos_pendentes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
              Datas Importantes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dib">DIB - Data de Início do Benefício</Label>
                <Input
                  id="dib"
                  type="date"
                  value={formData.dib}
                  onChange={(e) => handleChange("dib", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dcb">DCB - Data de Cessação do Benefício</Label>
                <Input
                  id="dcb"
                  type="date"
                  value={formData.dcb}
                  onChange={(e) => handleChange("dcb", e.target.value)}
                />
              </div>

              {formData.status === "Perícia Agendada" && (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="data_pericia">Data da Perícia *</Label>
                    <Input
                      id="data_pericia"
                      type="date"
                      value={formData.data_pericia}
                      onChange={(e) =>
                        handleChange("data_pericia", e.target.value)
                      }
                      className={errors.data_pericia ? "border-red-500" : ""}
                    />
                    {errors.data_pericia && (
                      <p className="text-sm text-red-500">
                        {errors.data_pericia}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="horario_pericia">
                      Horário da Perícia *
                    </Label>
                    <Input
                      id="horario_pericia"
                      type="time"
                      value={formData.horario_pericia}
                      onChange={(e) =>
                        handleChange("horario_pericia", e.target.value)
                      }
                      className={errors.horario_pericia ? "border-red-500" : ""}
                    />
                    {errors.horario_pericia && (
                      <p className="text-sm text-red-500">
                        {errors.horario_pericia}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="local_pericia">Local da Perícia</Label>
                    <Input
                      id="local_pericia"
                      value={formData.local_pericia}
                      onChange={(e) =>
                        handleChange("local_pericia", e.target.value)
                      }
                      placeholder="Endereço ou local da perícia"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pagamentos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Gestão de Pagamentos
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPagamentos(!showPagamentos)}
                className="text-blue-600"
              >
                {showPagamentos ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showPagamentos ? "Ocultar" : "Mostrar"}
              </Button>
            </div>

            {showPagamentos && (
              <div className="space-y-4">
                {formData.pagamentos.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-800">
                          Total Pago
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-green-900">
                          R$ {calcularPagamentosRealizados().toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-orange-800">
                          Pendente
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-orange-900">
                          R$ {calcularPagamentosPendentes().toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-800">
                          Total
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-blue-900">
                          R$ {calcularTotalPagamentos().toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="space-y-3">
                  {formData.pagamentos.map((pagamento, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Valor (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={pagamento.valor}
                                onChange={(e) =>
                                  atualizarPagamento(
                                    index,
                                    "valor",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="0.00"
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Data</Label>
                              <Input
                                type="date"
                                value={pagamento.data}
                                onChange={(e) =>
                                  atualizarPagamento(
                                    index,
                                    "data",
                                    e.target.value,
                                  )
                                }
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Status</Label>
                              <Select
                                value={pagamento.status}
                                onValueChange={(value) =>
                                  atualizarPagamento(index, "status", value)
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">
                                    Pendente
                                  </SelectItem>
                                  <SelectItem value="pago">Pago</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 md:col-span-1">
                              <Label className="text-xs">Observação</Label>
                              <Input
                                value={pagamento.observacao}
                                onChange={(e) =>
                                  atualizarPagamento(
                                    index,
                                    "observacao",
                                    e.target.value,
                                  )
                                }
                                placeholder="Ex: 1ª parcela"
                                className="h-9"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removerPagamento(index)}
                            className="hover:bg-red-100 hover:text-red-700 mt-5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={adicionarPagamento}
                  className="w-full border-dashed border-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Parcela / Pagamento
                </Button>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
              Observações Adicionais
            </h3>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Adicione informações relevantes sobre o caso..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar Perícia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
