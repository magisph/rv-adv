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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Save,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  DollarSign,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PericiaModal({
  isOpen,
  onClose,
  onSave,
  pericia,
  isLoading,
}) {
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
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
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPagamentos, setShowPagamentos] = useState(false);

  useEffect(() => {
    if (pericia) {
      setFormData({
        nome: pericia.nome || "",
        cpf: pericia.cpf || "",
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
      setFormData({
        nome: "",
        cpf: "",
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
      });
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

  const isValidCPF = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    // Rejeita sequências repetidas (ex: 000...000, 111...111)
    if (/^(\d)\1{10}$/.test(digits)) return false;

    const calcDigit = (slice, factor) => {
      const sum = slice.split("").reduce((acc, d, i) => acc + Number(d) * (factor - i), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 || remainder === 11 ? 0 : remainder;
    };

    const d1 = calcDigit(digits.slice(0, 9), 10);
    if (d1 !== Number(digits[9])) return false;
    const d2 = calcDigit(digits.slice(0, 10), 11);
    return d2 === Number(digits[10]);
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const handleCPFChange = (value) => {
    const formatted = formatCPF(value);
    handleChange("cpf", formatted);
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

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (!isValidCPF(formData.cpf)) {
      newErrors.cpf = "CPF inválido. Verifique os dígitos e tente novamente.";
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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const dataToSave = { ...formData };

    if (formData.status !== "Documentos Pendentes") {
      dataToSave.documentos_pendentes = "";
    }

    if (formData.status !== "Perícia Agendada") {
      dataToSave.data_pericia = "";
      dataToSave.horario_pericia = "";
      dataToSave.local_pericia = "";
    }

    onSave(dataToSave);
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
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  placeholder="Nome do cliente"
                  className={errors.nome ? "border-red-500" : ""}
                />
                {errors.nome && (
                  <p className="text-sm text-red-500">{errors.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={errors.cpf ? "border-red-500" : ""}
                />
                {errors.cpf && (
                  <p className="text-sm text-red-500">{errors.cpf}</p>
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
