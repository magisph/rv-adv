import { 
  addFieldRow,
  addFieldMultiline,
  addSectionTitle,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function ContatoSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  y = addSectionTitle(doc, 'Contato e Endereço', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);

  if (data.email) {
    y = addFieldMultiline(doc, 'E-mail', data.email, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }
  
  y = addFieldRow(doc, 'Telefone', data.telefone, '', '', y);
  
  if (data.endereco) {
    y = addFieldMultiline(doc, 'Endereço', data.endereco, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }
  
  y = addFieldRow(doc, 'CEP', data.cep, 'Cidade', data.cidade, y);
  y = addFieldRow(doc, 'Estado', data.estado, '', '', y);

  return y + SPACING.PARAGRAPH_SPACING;
}
