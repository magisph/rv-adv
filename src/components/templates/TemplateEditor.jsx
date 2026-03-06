import React, { useState } from "react";
import { clientService } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import { generateClientDocument } from "@/utils/documentGenerator";

export default function TemplateEditor({ template, onClose }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => clientService.list(),
  });

  const handleGenerate = async () => {
    if (!selectedClientId) {
      alert("Selecione um cliente para prosseguir.");
      return;
    }

    const clientData = clients.find((c) => c.id === selectedClientId);
    if (!clientData) return;

    setIsGenerating(true);
    try {
      await generateClientDocument(
        template.file_url,
        clientData,
        template.name
      );
      alert("Documento gerado com sucesso e anexado ao cliente em background!");
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao gerar o documento:\n" + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full -mt-2">
      <Card className="border-0 shadow-sm mt-4">
        <CardHeader>
          <CardTitle className="text-lg">
            Gerar Documento a partir do Molde
          </CardTitle>
          <p className="text-sm text-slate-500">
            Você está utilizando o template: <strong>{template?.name}</strong>.
            As variáveis do arquivo '.docx' serão preenchidas com as
            informações do cliente selecionado abaixo.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-md">
            <Label>Selecione o Cliente</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={isLoadingClients}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingClients
                      ? "Carregando clientes..."
                      : "Selecione um cliente"
                  }
                />
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

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedClientId}
              className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? "Gerando..." : "Gerar Documento"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
