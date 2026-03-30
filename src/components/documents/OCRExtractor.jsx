import React, { useState } from "react";
import { aiService } from "@/services/aiService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Validação de CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  let digito1 = resto >= 10 ? 0 : resto;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  let digito2 = resto >= 10 ? 0 : resto;

  return (
    parseInt(cpf.charAt(9)) === digito1 && parseInt(cpf.charAt(10)) === digito2
  );
}

// Validação de CNPJ
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, "");
  if (cnpj.length !== 14) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado == digitos.charAt(1);
}

export default function OCRExtractor({
  fileUrl,
  documentType,
  onDataExtracted,
  onCancel,
}) {
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [editedData, setEditedData] = useState({});

  const handleExtract = async () => {
    setExtracting(true);
    try {
      let prompt = "";
      let schema = {};

      switch (documentType) {
        case "rg":
          prompt =
            "Extraia as seguintes informações deste RG (Registro Geral/Identidade): número do RG, data de emissão, órgão expedidor, nome completo, data de nascimento. Se algum campo não estiver visível, retorne null.";
          schema = {
            type: "object",
            properties: {
              rg: { type: "string" },
              data_emissao_rg: { type: "string" },
              orgao_expedidor: { type: "string" },
              full_name: { type: "string" },
              data_nascimento: { type: "string" },
            },
          };
          break;

        case "cpf":
          prompt =
            "Extraia o número do CPF deste documento. Retorne apenas os dígitos, sem pontos ou traços.";
          schema = {
            type: "object",
            properties: {
              cpf_cnpj: { type: "string" },
            },
          };
          break;

        case "cnh":
          prompt =
            "Extraia as seguintes informações desta CNH: número da CNH, nome completo, data de nascimento, CPF, data de emissão, data de validade.";
          schema = {
            type: "object",
            properties: {
              cnh: { type: "string" },
              full_name: { type: "string" },
              data_nascimento: { type: "string" },
              cpf_cnpj: { type: "string" },
              data_emissao: { type: "string" },
              data_validade: { type: "string" },
            },
          };
          break;

        case "comprovante_endereco":
          prompt =
            "Extraia as seguintes informações deste comprovante de endereço: endereço completo (rua, número, complemento), cidade, estado, CEP, data do documento.";
          schema = {
            type: "object",
            properties: {
              address: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              zip_code: { type: "string" },
              data_comprovante: { type: "string" },
            },
          };
          break;

        default:
          toast.error("Tipo de documento não suportado para OCR");
          setExtracting(false);
          return;
      }

      const result = await aiService.invokeLLM({
        prompt,
        response_json_schema: schema,
      });

      setExtractedData(result);
      setEditedData(result);
    } catch (error) {
      toast.error("Erro ao extrair informações do documento");
      console.error(error);
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = () => {
    // Validar CPF/CNPJ se presente
    if (editedData.cpf_cnpj) {
      const cpfCnpj = editedData.cpf_cnpj.replace(/[^\d]/g, "");
      if (cpfCnpj.length === 11) {
        if (!validarCPF(cpfCnpj)) {
          toast.error("CPF inválido");
          return;
        }
      } else if (cpfCnpj.length === 14) {
        if (!validarCNPJ(cpfCnpj)) {
          toast.error("CNPJ inválido");
          return;
        }
      }
    }

    onDataExtracted(editedData);
  };

  const fieldLabels = {
    rg: "RG",
    data_emissao_rg: "Data de Emissão",
    orgao_expedidor: "Órgão Expedidor",
    full_name: "Nome Completo",
    data_nascimento: "Data de Nascimento",
    cpf_cnpj: "CPF/CNPJ",
    cnh: "Número CNH",
    data_emissao: "Data de Emissão",
    data_validade: "Data de Validade",
    address: "Endereço",
    city: "Cidade",
    state: "Estado",
    zip_code: "CEP",
    data_comprovante: "Data do Comprovante",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Extração Automática de Dados (OCR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-600 mb-4">
              Clique no botão abaixo para extrair automaticamente as informações
              do documento
            </p>
            <Button
              onClick={handleExtract}
              disabled={extracting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extraindo informações...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extrair Dados do Documento
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
              <Check className="w-4 h-4" />
              Dados extraídos com sucesso! Revise as informações abaixo:
            </div>

            {Object.entries(editedData).map(
              ([key, value]) =>
                value !== null && (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm">{fieldLabels[key] || key}</Label>
                    <Input
                      type={key.includes("data") ? "date" : "text"}
                      value={editedData[key] || ""}
                      onChange={(e) =>
                        setEditedData({ ...editedData, [key]: e.target.value })
                      }
                      className="h-9"
                    />
                    {key === "cpf_cnpj" && editedData[key] && (
                      <p className="text-xs text-slate-600">
                        {validarCPF(editedData[key].replace(/[^\d]/g, "")) ? (
                          <span className="text-green-600">✓ CPF válido</span>
                        ) : validarCNPJ(
                            editedData[key].replace(/[^\d]/g, ""),
                          ) ? (
                          <span className="text-green-600">✓ CNPJ válido</span>
                        ) : (
                          <span className="text-red-600">
                            ✗ CPF/CNPJ inválido
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                ),
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleConfirm} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Confirmar e Preencher Formulário
              </Button>
              <Button variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
