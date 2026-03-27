import { 
  addFieldRow,
  addSectionTitle,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function InfoPessoaisSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - PAGE_CONFIG.MARGIN_LEFT - PAGE_CONFIG.MARGIN_RIGHT;
  const halfWidth = availableWidth / 2 - 3;

  y = addSectionTitle(doc, 'Informações Pessoais', y);
  
  y = addFieldRow(doc, 'Nome Completo', data.full_name || '-', 'CPF', data.cpf_cnpj || '-', y);
  y = addFieldRow(doc, 'Data de Nascimento', data.data_nascimento || '-', 'Idade', data.idade || '-', y);
  y = addFieldRow(doc, 'RG', data.rg || '-', 'Órgão Expedidor', data.orgao_expedidor || '-', y);
  y = addFieldRow(doc, 'Estado Civil', data.estado_civil || '-', 'Escolaridade', data.grau_escolaridade || '-', y);
  y = addFieldRow(doc, 'Profissão', data.profissao || '-', '', '', y);

  return y + SPACING.PARAGRAPH_SPACING;
}
