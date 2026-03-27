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
  
  // [FIX: Quebra de Página] Passar addHeaderFn/headerTitle para addFieldRow
  y = addFieldRow(doc, 'Telefone', data.telefone, '', '', y, addHeaderFn, headerTitle);
  
  if (data.endereco) {
    y = addFieldMultiline(doc, 'Endereço', data.endereco, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }
  
  y = addFieldRow(doc, 'CEP', data.cep, 'Cidade', data.cidade, y, addHeaderFn, headerTitle);
  y = addFieldRow(doc, 'Estado', data.estado, '', '', y, addHeaderFn, headerTitle);

  return y + SPACING.PARAGRAPH_SPACING;
}
