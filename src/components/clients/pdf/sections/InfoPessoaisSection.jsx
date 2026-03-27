import { 
  addFieldRow,
  addSectionTitle,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function InfoPessoaisSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  y = addSectionTitle(doc, 'Informações Pessoais', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);
  
  y = addFieldRow(doc, 'Nome Completo', data.full_name, 'CPF', data.cpf_cnpj, y);
  y = addFieldRow(doc, 'Data de Nascimento', data.data_nascimento, 'Idade', data.idade, y);
  y = addFieldRow(doc, 'RG', data.rg, 'Órgão Expedidor', data.orgao_expedidor, y);
  y = addFieldRow(doc, 'Estado Civil', data.estado_civil, 'Escolaridade', data.grau_escolaridade, y);
  y = addFieldRow(doc, 'Profissão', data.profissao, '', '', y);

  return y + SPACING.PARAGRAPH_SPACING;
}
