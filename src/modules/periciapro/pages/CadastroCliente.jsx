import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { periciaService } from "@/modules/periciapro/services/periciaService";
import { activityLogService } from "@/modules/periciapro/services/activityLogService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  UserPlus,
  CheckCircle,
  FileText,
  Calendar as CalendarIcon,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// BUG #12 fix: CPF format and check-digit validation
const isValidCPF = (cpf) => {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length !== 11) return false;
  // Reject all-same-digit CPFs (e.g., 111.111.111-11)
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  return true;
};

export default function CadastroCliente() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPagamentos, setShowPagamentos] = useState(false);
  // BUG #13 fix: ref to track the redirect timeout for cleanup on unmount
  const timeoutRef = useRef(null);

  // BUG #13 fix: cleanup redirect timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Separate pagamentos from pericia data — they go to different tables
      const { pagamentos, ...periciaData } = data;

      // 1. Insert the pericia record (without pagamentos)
      const nova = await periciaService.create(periciaData);

      // BUG #11 fix: if pagamentos insert fails, rollback the pericia to avoid orphan records
      try {
        // 2. Insert pagamentos into separate table if any
        if (pagamentos && pagamentos.length > 0) {
          await periciaService.upsertPagamentos(nova.id, pagamentos);
        }
      } catch (pagamentosError) {
        // Rollback: delete the pericia we just created
        try {
          await periciaService.delete(nova.id);
        } catch (rollbackError) {
          console.error("[CadastroCliente] Rollback falhou — registro órfão criado:", rollbackError);
        }
        throw pagamentosError;
      }

      // 3. Log the creation (non-critical — don't rollback for log failure)
      try {
        await activityLogService.create({
          pericia_id: nova.id,
          type: "creation",
          description: `Cliente cadastrado: ${nova.nome}`,
        });
      } catch (logError) {
        console.warn("[CadastroCliente] Log de atividade falhou (não crítico):", logError);
      }

      return nova;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pericias"] });
      setShowSuccess(true);
      toast({
        title: "✅ Cadastro realizado",
        description: "Cliente cadastrado com sucesso!",
      });

      // BUG #13 fix: store timer in ref so cleanup useEffect can cancel it on unmount
      timeoutRef.current = setTimeout(() => {
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
        setShowSuccess(false);
        navigate("/pericias/painel");
      }, 2000);
    },
    onError: (error) => {
      console.error("[CadastroCliente] Erro ao cadastrar:", error);
      toast({
        title: "❌ Erro ao cadastrar",
        description: error?.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpa erro do campo quando usuário começa a digitar
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return numbers; // Return numbers instead of value if it exceeds 11, to prevent invalid format
  };

  const handleCPFChange = (value) => {
    const formatted = formatCPF(value);
    handleChange("cpf", formatted);
  };

  // New payment management functions
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
      // BUG #12 fix: validate CPF format (11 digits) and check digits
      newErrors.cpf = "CPF inválido. Verifique o número digitado.";
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

    // Limpa campos condicionais se não forem necessários
    if (formData.status !== "Documentos Pendentes") {
      dataToSave.documentos_pendentes = "";
    }

    if (formData.status !== "Perícia Agendada") {
      dataToSave.data_pericia = "";
      dataToSave.horario_pericia = "";
      dataToSave.local_pericia = "";
    }

    createMutation.mutate(dataToSave);
  };

  const handleCancel = () => {
    navigate("/pericias/painel");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <UserPlus className="w-10 h-10 text-green-600" />
              Cadastro de Cliente
            </h1>
            <p className="text-slate-600 mt-1">
              Preencha os dados do cliente para iniciar o acompanhamento
              previdenciário
            </p>
          </div>
        </div>

        {/* Alerta de Sucesso */}
        {showSuccess && (
          <Alert className="bg-green-50 border-green-300 animate-in fade-in slide-in-from-top-5">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              Cliente cadastrado com sucesso! Redirecionando para o dashboard...
            </AlertDescription>
          </Alert>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Informações Pessoais */}
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-green-50">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nome" className="text-sm font-semibold">
                      Nome Completo *
                    </Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleChange("nome", e.target.value)}
                      placeholder="Digite o nome completo do cliente"
                      className={`h-11 ${errors.nome ? "border-red-500 focus:ring-red-500" : ""}`}
                    />
                    {errors.nome && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.nome}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-sm font-semibold">
                      CPF *
                    </Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleCPFChange(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={`h-11 ${errors.cpf ? "border-red-500 focus:ring-red-500" : ""}`}
                    />
                    {errors.cpf && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.cpf}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="senha_inss"
                      className="text-sm font-semibold"
                    >
                      Senha INSS
                    </Label>
                    <div className="relative">
                      <Input
                        id="senha_inss"
                        type={showPassword ? "text" : "password"}
                        value={formData.senha_inss}
                        onChange={(e) =>
                          handleChange("senha_inss", e.target.value)
                        }
                        placeholder="Senha do cliente no INSS"
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-11"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-800">
                        Senha armazenada de forma segura para acesso aos dados
                        previdenciários.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Processo */}
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Informações do Processo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="esfera" className="text-sm font-semibold">
                      Esfera *
                    </Label>
                    <Select
                      value={formData.esfera}
                      onValueChange={(value) => handleChange("esfera", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Administrativa">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Administrativa
                          </div>
                        </SelectItem>
                        <SelectItem value="Judicial">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            Judicial
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-semibold">
                      Status *
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleChange("status", value)}
                    >
                      <SelectTrigger className="h-11">
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

                  {/* Campo Condicional: Documentos Pendentes */}
                  {formData.status === "Documentos Pendentes" && (
                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="documentos_pendentes"
                        className="text-sm font-semibold"
                      >
                        Documentos Pendentes *
                      </Label>
                      <Textarea
                        id="documentos_pendentes"
                        value={formData.documentos_pendentes}
                        onChange={(e) =>
                          handleChange("documentos_pendentes", e.target.value)
                        }
                        placeholder="Liste os documentos que estão pendentes..."
                        rows={4}
                        className={
                          errors.documentos_pendentes
                            ? "border-red-500 focus:ring-red-500"
                            : ""
                        }
                      />
                      {errors.documentos_pendentes && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.documentos_pendentes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Datas Importantes */}
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-purple-50">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <CalendarIcon className="w-5 h-5 text-purple-600" />
                  Datas Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dib" className="text-sm font-semibold">
                      DIB - Data de Início do Benefício
                    </Label>
                    <Input
                      id="dib"
                      type="date"
                      value={formData.dib}
                      onChange={(e) => handleChange("dib", e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-slate-600">
                      Data em que o benefício foi iniciado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dcb" className="text-sm font-semibold">
                      DCB - Data de Cessação do Benefício
                    </Label>
                    <Input
                      id="dcb"
                      type="date"
                      value={formData.dcb}
                      onChange={(e) => handleChange("dcb", e.target.value)}
                      className="h-11"
                    />
                    {formData.dcb && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <AlertDescription className="text-xs text-blue-800">
                          ⏰ Alerta será gerado 15 dias antes desta data
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {formData.status === "Perícia Agendada" && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="data_pericia"
                          className="text-sm font-semibold"
                        >
                          Data da Perícia *
                        </Label>
                        <Input
                          id="data_pericia"
                          type="date"
                          value={formData.data_pericia}
                          onChange={(e) =>
                            handleChange("data_pericia", e.target.value)
                          }
                          className={`h-11 ${errors.data_pericia ? "border-red-500 focus:ring-red-500" : ""}`}
                        />
                        {errors.data_pericia && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.data_pericia}
                          </p>
                        )}
                        {formData.data_pericia && !errors.data_pericia && (
                          <Alert className="bg-purple-50 border-purple-200">
                            <AlertCircle className="w-4 h-4 text-purple-600" />
                            <AlertDescription className="text-xs text-purple-800">
                              ⏰ Alertas em: 45, 30, 15 e 1 dia antes
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="horario_pericia"
                          className="text-sm font-semibold"
                        >
                          Horário da Perícia *
                        </Label>
                        <Input
                          id="horario_pericia"
                          type="time"
                          value={formData.horario_pericia}
                          onChange={(e) =>
                            handleChange("horario_pericia", e.target.value)
                          }
                          className={`h-11 ${errors.horario_pericia ? "border-red-500 focus:ring-red-500" : ""}`}
                        />
                        {errors.horario_pericia && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.horario_pericia}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="local_pericia"
                          className="text-sm font-semibold"
                        >
                          Local da Perícia
                        </Label>
                        <Input
                          id="local_pericia"
                          value={formData.local_pericia}
                          onChange={(e) =>
                            handleChange("local_pericia", e.target.value)
                          }
                          placeholder="Endereço ou local da perícia"
                          className="h-11"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Gestão de Pagamentos */}
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-green-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Gestão de Pagamentos
                  </CardTitle>
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
              </CardHeader>

              {showPagamentos && (
                <CardContent className="p-6 space-y-4">
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
                              <div className="space-y-1">
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
                </CardContent>
              )}
            </Card>

            {/* Observações */}
            <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-orange-50">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Observações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="observacoes"
                    className="text-sm font-semibold"
                  >
                    Observações
                  </Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) =>
                      handleChange("observacoes", e.target.value)
                    }
                    placeholder="Adicione informações relevantes sobre o caso, histórico médico, particularidades do cliente..."
                    rows={6}
                  />
                  <p className="text-xs text-slate-600">
                    Use este campo para registrar informações importantes que
                    auxiliem no acompanhamento do caso
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <Card className="border-none shadow-xl bg-gradient-to-r from-blue-50 to-green-50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={createMutation.isPending}
                    className="md:w-40 h-12 font-semibold"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="md:w-40 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg font-semibold"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Cadastrar Cliente
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
