import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Upload,
  User,
  Building,
  Heart,
  Sprout,
  ChevronRight,
  LineChart,
} from "lucide-react";

// Configuração das categorias com cores e subcategorias
export const DOCUMENT_CATEGORIES = {
  pessoais: {
    name: "Pessoais",
    color: "#2196F3",
    bgColor: "#E3F2FD",
    borderColor: "#2196F3",
    icon: User,
    description: "RG, CPF, Comprovante Residência",
    subcategories: [
      { id: "rg", label: "RG (Registro Geral / Identidade)" },
      { id: "cpf", label: "CPF (Cadastro de Pessoa Física)" },
      { id: "comprovante_residencia", label: "Comprovante de Residência" },
      { id: "certidao_nascimento", label: "Certidão de Nascimento" },
      { id: "certidao_casamento", label: "Certidão de Casamento" },
      { id: "cnh", label: "CNH (Carteira Nacional de Habilitação)" },
      { id: "titulo_eleitor", label: "Título de Eleitor" },
      { id: "outros_pessoais", label: "Outros Documentos Pessoais" },
    ],
  },
  inss: {
    name: "INSS",
    color: "#FF9800",
    bgColor: "#FFF3E0",
    borderColor: "#FF9800",
    icon: Building,
    description: "CNIS, Carteira de Trabalho, Protocolos",
    subcategories: [
      { id: "cnis", label: "CNIS (Cadastro Nacional de Informações Sociais)" },
      {
        id: "carteira_trabalho",
        label: "Carteira de Trabalho (física ou digital)",
      },
      { id: "protocolos", label: "Protocolos" },
      { id: "extrato_previdenciario", label: "Extrato Previdenciário" },
      { id: "carta_concessao", label: "Carta de Concessão" },
      { id: "carta_indeferimento", label: "Carta de Indeferimento" },
      { id: "recursos_administrativos", label: "Recursos Administrativos" },
      { id: "outros_inss", label: "Outros Documentos INSS" },
    ],
  },
  medicos: {
    name: "Médicos",
    color: "#FFC107",
    bgColor: "#FFF9C4",
    borderColor: "#FFC107",
    icon: Heart,
    description: "Laudos, Exames, Receitas",
    subcategories: [
      { id: "laudos_medicos", label: "Laudos Médicos" },
      { id: "exames", label: "Exames (laboratoriais, imagem)" },
      { id: "receitas", label: "Receitas" },
      { id: "atestados", label: "Atestados" },
      { id: "relatorios_medicos", label: "Relatórios Médicos" },
      { id: "prontuarios", label: "Prontuários" },
      { id: "documentos_pericia", label: "Documentos de Perícia" },
      { id: "outros_medicos", label: "Outros Documentos Médicos" },
    ],
  },
  rurais: {
    name: "Documentos Rurais",
    color: "#4CAF50",
    bgColor: "#E8F5E9",
    borderColor: "#4CAF50",
    icon: Sprout,
    description:
      "DAP, CAF, Documentos de Terra, Notas Fiscais, Declarações Sindicais",
    subcategories: [
      { id: "dap", label: "DAP (Declaração de Aptidão ao Pronaf)" },
      { id: "caf", label: "CAF (Cadastro de Atividade Rural)" },
      { id: "escritura_terra", label: "Escritura/Documento da terra" },
      {
        id: "contrato_arrendamento",
        label: "Contrato de arrendamento/parceria/meação",
      },
      { id: "certidao_imovel_rural", label: "Certidão de Imóvel Rural" },
      {
        id: "notas_fiscais_produtor",
        label: "Notas fiscais de produtor rural",
      },
      {
        id: "comprovante_itr",
        label: "Comprovante de ITR (Imposto Territorial Rural)",
      },
      { id: "emprestimo_rural", label: "Comprovante de empréstimo rural" },
      { id: "seguro_safra", label: "Comprovante de Seguro Safra" },
      {
        id: "declaracao_sindicato",
        label: "Declaração do Sindicato dos Trabalhadores Rurais",
      },
      { id: "carteira_sindical", label: "Carteira de filiação sindical" },
      {
        id: "contribuicao_sindical",
        label: "Comprovante de pagamento de contribuição sindical",
      },
      {
        id: "declaracao_vizinhos",
        label: "Declaração de vizinhos/proprietários",
      },
      { id: "comprovante_venda", label: "Comprovante de venda de produção" },
      { id: "fotos_propriedade", label: "Fotos da propriedade rural" },
      { id: "outros_rurais", label: "Outros" },
    ],
  },
  analises: {
    name: "Análises",
    color: "#9C27B0",
    bgColor: "#F3E5F5",
    borderColor: "#9C27B0",
    icon: LineChart,
    description: "Análise de Risco, Cálculo Previdenciário, Parecer Técnico",
    subcategories: [
      { id: "analise_risco", label: "Análise de Risco" },
      { id: "calculo_previdenciario", label: "Cálculo Previdenciário" },
      { id: "parecer_tecnico", label: "Parecer Técnico" },
      { id: "outros_analises", label: "Outros" },
    ],
  },
};

export default function DocumentCategories({
  documents = [],
  onCategoryClick,
  onUploadClick,
}) {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const getDocumentCount = (categoryKey) => {
    return documents.filter(
      (doc) => doc.category === categoryKey && doc.is_active !== false,
    ).length;
  };

  const categories = Object.entries(DOCUMENT_CATEGORIES);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map(([key, category], index) => {
        const Icon = category.icon;
        const count = getDocumentCount(key);
        const isHovered = hoveredCategory === key;

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onMouseEnter={() => setHoveredCategory(key)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <Card
              className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg"
              style={{
                borderLeftWidth: "4px",
                borderLeftColor: category.borderColor,
                backgroundColor: isHovered ? category.bgColor : "white",
              }}
              onClick={() => onCategoryClick(key)}
            >
              <CardContent className="p-5">
                {/* Badge contador */}
                <Badge
                  className="absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: category.color }}
                >
                  {count}
                </Badge>

                {/* Ícone e Título */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.bgColor }}
                  >
                    <FolderOpen
                      className="w-5 h-5"
                      style={{ color: category.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="font-bold text-lg"
                      style={{ color: category.color }}
                    >
                      {category.name}
                    </h3>
                  </div>
                </div>

                {/* Descrição */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-1">
                  {category.description}
                </p>

                {/* Botão de Upload */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full transition-all"
                  style={{
                    borderColor: category.color,
                    color: category.color,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUploadClick(key);
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Arquivo
                </Button>

                {/* Indicador de mais documentos */}
                {count > 0 && (
                  <div className="flex items-center justify-end mt-3 text-xs text-slate-600">
                    <span>Ver documentos</span>
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
