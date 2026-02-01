import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";

// Definição dos checklists por tipo de benefício
const CHECKLISTS = {
  bpc_loas_idoso: [
    { id: "cadunico", label: "Cadastro Único Atualizado" },
    { id: "renda_familiar", label: "Comprovantes de Renda Familiar" },
    { id: "docs_membros", label: "Documentos do Grupo Familiar" },
    { id: "comprovante_residencia", label: "Comprovante de Residência" },
    { id: "fotos_residencia", label: "Fotos da Residência" },
    { id: "declaracao_bens", label: "Declaração de Bens" },
    { id: "comprovante_despesas", label: "Comprovantes de Despesas" },
  ],
  bpc_loas_pcd: [
    { id: "cadunico", label: "Cadastro Único Atualizado" },
    { id: "laudo_medico", label: "Laudo Médico Atualizado" },
    { id: "renda_familiar", label: "Comprovantes de Renda Familiar" },
    { id: "docs_membros", label: "Documentos do Grupo Familiar" },
    { id: "comprovante_residencia", label: "Comprovante de Residência" },
  ],
  aposentadoria_idade_rural: [
    { id: "autodeclaracao", label: "Autodeclaração de Atividade Rural" },
    { id: "docs_terra", label: "Documentos da Terra" },
    { id: "dap_caf", label: "DAP/CAF" },
    { id: "notas_fiscais", label: "Notas Fiscais de Produção" },
    { id: "ctps", label: "CTPS" },
    { id: "ficha_sindicato", label: "Ficha do Sindicato" },
  ],
  incapacidade_rural: [
    { id: "laudos_medicos", label: "Laudos Médicos" },
    { id: "receitas_exames", label: "Receitas e Exames" },
    { id: "autodeclaracao", label: "Autodeclaração de Atividade Rural" },
    { id: "docs_terra", label: "Documentos da Terra" },
    { id: "ctps", label: "CTPS" },
  ],
  salario_maternidade_rural: [
    { id: "certidao_nascimento", label: "Certidão de Nascimento do Filho" },
    { id: "dnv", label: "DNV (Declaração de Nascido Vivo)" },
    { id: "atestado_medico", label: "Atestado Médico" },
    { id: "autodeclaracao", label: "Autodeclaração de Atividade Rural" },
    { id: "docs_terra", label: "Documentos da Terra" },
  ],
};

const TIPOS_LABELS = {
  bpc_loas_idoso: "BPC/LOAS - Idoso",
  bpc_loas_pcd: "BPC/LOAS - PCD",
  aposentadoria_idade_rural: "Aposentadoria Rural",
  incapacidade_rural: "Incapacidade Rural",
  salario_maternidade_rural: "Salário-Maternidade Rural",
};

export default function DocumentStatusCard({
  documents = [],
  beneficios = [],
  onNavigateToDocuments,
  onNavigateToBeneficio,
}) {
  const [expandedSections, setExpandedSections] = useState({ general: true });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Calcular status dos documentos gerais
  const generalDocs = [
    { id: "rg", label: "RG", category: "pessoais" },
    { id: "cpf", label: "CPF", category: "pessoais" },
    {
      id: "comprovante_residencia",
      label: "Comprovante de Endereço",
      category: "pessoais",
    },
    {
      id: "certidao_nascimento",
      label: "Certidão de Nascimento",
      category: "pessoais",
    },
    { id: "procuracao", label: "Procuração", category: "judicial" },
  ];

  const generalDocsStatus = generalDocs.map((doc) => {
    const uploaded = documents.find(
      (d) =>
        d.name?.toLowerCase().includes(doc.label.toLowerCase()) ||
        d.subcategory?.toLowerCase().includes(doc.id.toLowerCase()),
    );
    return {
      ...doc,
      status: uploaded ? "complete" : "pending",
      date: uploaded?.created_date,
    };
  });

  const generalComplete = generalDocsStatus.filter(
    (d) => d.status === "complete",
  ).length;
  const generalProgress = (generalComplete / generalDocs.length) * 100;

  // Renderizar seção de documentos gerais
  const renderGeneralSection = () => (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection("general")}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">Documentos Gerais</span>
          <Badge variant="outline" className="text-xs">
            {generalComplete}/{generalDocs.length}
          </Badge>
        </div>
        {expandedSections.general ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {expandedSections.general && (
        <div className="p-4 space-y-3">
          {generalDocsStatus.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {doc.status === "complete" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                )}
                <span
                  className={
                    doc.status === "complete"
                      ? "text-slate-700"
                      : "text-slate-500"
                  }
                >
                  {doc.label}
                </span>
              </div>
              {doc.status === "complete" && doc.date && (
                <span className="text-xs text-slate-400">
                  {format(new Date(doc.date), "dd/MM/yyyy")}
                </span>
              )}
            </div>
          ))}

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Progresso</span>
              <span>{Math.round(generalProgress)}%</span>
            </div>
            <Progress value={generalProgress} className="h-2" />
          </div>
        </div>
      )}
    </div>
  );

  // Renderizar seção de benefício
  const renderBeneficioSection = (beneficio) => {
    const checklist = CHECKLISTS[beneficio.tipo_beneficio] || [];
    const checklistData = beneficio.checklist_documentos || {};

    const items = checklist.map((item) => {
      const itemData = checklistData[item.id];
      const isComplete = itemData?.checked && itemData?.arquivos?.length > 0;
      return {
        ...item,
        status: isComplete ? "complete" : "pending",
        date: itemData?.arquivos?.[0]?.data_upload,
        observations: itemData?.observacoes,
      };
    });

    const complete = items.filter((i) => i.status === "complete").length;
    const progress =
      checklist.length > 0 ? (complete / checklist.length) * 100 : 0;
    const sectionKey = `beneficio-${beneficio.id}`;

    return (
      <div key={beneficio.id} className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-slate-800">
              {TIPOS_LABELS[beneficio.tipo_beneficio] ||
                beneficio.tipo_beneficio}
            </span>
            <Badge variant="outline" className="text-xs">
              {complete}/{checklist.length}
            </Badge>
          </div>
          {expandedSections[sectionKey] ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expandedSections[sectionKey] && (
          <div className="p-4 space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                Nenhum documento definido para este tipo de benefício
              </p>
            ) : (
              <>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {item.status === "complete" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                      <button
                        onClick={() => onNavigateToBeneficio?.(beneficio)}
                        className="text-left hover:text-blue-600 transition-colors"
                      >
                        {item.label}
                      </button>
                    </div>
                    {item.status === "complete" && item.date && (
                      <span className="text-xs text-slate-400">
                        {format(new Date(item.date), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                ))}

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Progresso</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Calcular progresso geral
  const totalDocs =
    generalDocs.length +
    beneficios.reduce((acc, b) => {
      const checklist = CHECKLISTS[b.tipo_beneficio] || [];
      return acc + checklist.length;
    }, 0);

  const totalComplete =
    generalComplete +
    beneficios.reduce((acc, b) => {
      const checklist = CHECKLISTS[b.tipo_beneficio] || [];
      const checklistData = b.checklist_documentos || {};
      const complete = checklist.filter((item) => {
        const itemData = checklistData[item.id];
        return itemData?.checked && itemData?.arquivos?.length > 0;
      }).length;
      return acc + complete;
    }, 0);

  const overallProgress = totalDocs > 0 ? (totalComplete / totalDocs) * 100 : 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#1e3a5f]" />
            Status de Documentos
          </CardTitle>
          <Badge variant="outline" className="text-sm">
            {totalComplete}/{totalDocs} completos
          </Badge>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Progresso Geral</span>
            <span className="font-semibold">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {renderGeneralSection()}

          {beneficios.map((beneficio) => renderBeneficioSection(beneficio))}

          {beneficios.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">Nenhum benefício cadastrado ainda</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
