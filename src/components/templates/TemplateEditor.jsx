import React, { useState, useEffect } from "react";
import { base44 } from "@/lib/adapters/legacyBase44";
import { useQuery } from "@tanstack/react-query";
import ReactQuill from "react-quill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Sparkles, FileDown, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["clean"],
  ],
};

export default function TemplateEditor({
  template,
  onSave,
  onClose,
  isSaving,
}) {
  const [content, setContent] = useState(template?.content || "");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes-list"],
    queryFn: () => base44.entities.Process.list(),
  });

  useEffect(() => {
    if (template?.content) {
      setContent(template.content);
    }
  }, [template]);

  const handleSave = () => {
    onSave({ ...template, content });
  };

  const handleImproveWithAI = async () => {
    setIsImproving(true);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um advogado experiente. Reescreva o texto abaixo em tom jurídico formal,
      melhorando a linguagem, a estrutura e a clareza. Mantenha todas as variáveis no formato {{variavel}}.

      Texto original:
      ${content}

      Retorne apenas o texto melhorado, sem explicações adicionais.`,
      response_json_schema: {
        type: "object",
        properties: {
          improved_text: { type: "string" },
        },
      },
    });

    setContent(response.improved_text);
    setIsImproving(false);
  };

  const generateDocument = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    const process = processes.find((p) => p.id === selectedProcessId);

    let generated = content;

    // Replace variables
    const replacements = {
      nome_cliente: client?.full_name || "[NOME DO CLIENTE]",
      cpf_cliente: client?.cpf_cnpj || "[CPF]",
      numero_processo: process?.process_number || "[NÚMERO DO PROCESSO]",
      tribunal: process?.court || "[TRIBUNAL]",
      valor_causa:
        process?.case_value?.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }) || "[VALOR]",
      data_hoje: format(new Date(), "dd 'de' MMMM 'de' yyyy"),
      nome_advogado: "[NOME DO ADVOGADO]",
      oab_advogado: "[OAB]",
    };

    Object.entries(replacements).forEach(([key, value]) => {
      generated = generated.replace(new RegExp(`{{${key}}}`, "g"), value);
    });

    setGeneratedContent(generated);
    setActiveTab("preview");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Strip HTML tags for plain text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = generatedContent || content;
    const text = tempDiv.textContent || tempDiv.innerText || "";

    // Configure PDF
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;

    doc.setFont("helvetica");
    doc.setFontSize(11);

    // Split text into lines
    const lines = doc.splitTextToSize(text, maxWidth);

    let yPosition = margin;
    const lineHeight = 7;

    lines.forEach((line, index) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    doc.save(`${template?.name || "documento"}.pdf`);
  };

  return (
    <div className="flex flex-col h-full -mt-2">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="generate">Gerar Documento</TabsTrigger>
            <TabsTrigger value="preview">Prévia</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleImproveWithAI}
              disabled={isImproving || !content}
            >
              {isImproving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Melhorar com IA
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        <TabsContent value="edit" className="flex-1 mt-0">
          <div className="border rounded-lg overflow-hidden h-[calc(100%-2rem)]">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              className="h-full"
              style={{ height: "calc(100% - 42px)" }}
            />
          </div>
        </TabsContent>

        <TabsContent value="generate" className="mt-0">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Selecionar Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
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
                </div>
                <div className="space-y-2">
                  <Label>Processo (opcional)</Label>
                  <Select
                    value={selectedProcessId}
                    onValueChange={setSelectedProcessId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um processo" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.map((process) => (
                        <SelectItem key={process.id} value={process.id}>
                          {process.process_number} - {process.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={generateDocument}
                className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Gerar Documento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 mt-0">
          <Card className="border-0 shadow-sm h-full overflow-auto">
            <CardContent className="p-8">
              {generatedContent ? (
                <>
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={exportToPDF}
                      variant="outline"
                      className="bg-red-50 hover:bg-red-100 border-red-200"
                    >
                      <FileText className="w-4 h-4 mr-2 text-red-600" />
                      Exportar PDF
                    </Button>
                  </div>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: generatedContent }}
                  />
                </>
              ) : (
                <div className="text-center text-slate-500 py-12">
                  <FileDown className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>
                    Gere um documento na aba anterior para visualizar a prévia
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
