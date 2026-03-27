import { 
  addFieldRow,
  addFieldMultiline,
  addSectionTitle,
  SPACING 
} from '@/utils/pdfExporter';

export function ContatoSection(doc, data, y) {
  y = addSectionTitle(doc, 'Contato e Endereço', y);

  if (data.email) {
    y = addFieldMultiline(doc, 'E-mail', data.email, y);
  }
  
  y = addFieldRow(doc, 'Telefone', data.telefone || '-', '', '', y);
  
  if (data.endereco) {
    y = addFieldMultiline(doc, 'Endereço', data.endereco, y);
  }
  
  y = addFieldRow(doc, 'CEP', data.cep || '-', 'Cidade', data.cidade || '-', y);
  y = addFieldRow(doc, 'Estado', data.estado || '-', '', '', y);

  return y + SPACING.PARAGRAPH_SPACING;
}
