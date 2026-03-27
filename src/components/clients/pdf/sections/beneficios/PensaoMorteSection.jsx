import { 
  addField, 
  addFieldValueOnly,
  addFieldRow,
  addSectionTitle,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function PensaoMorteSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  // ═══ DADOS DO FALECIDO ═══
  y = addSectionTitle(doc, 'Dados do Falecido', y);
  
  if (data.falecido) {
    const fal = data.falecido;
    
    y = addField(doc, 'Nome', fal.nome, y);
    y = addFieldRow(doc, 'Data do Óbito', fal.data_obito, 'Grau de Parentesco', fal.grau_parentesco, y);
    y += SPACING.PARAGRAPH_SPACING;
  }

  // ═══ INFORMAÇÕES ADICIONAIS ═══
  if (data.outras_informacoes && data.outras_informacoes !== '-' && data.outras_informacoes !== '[NÃO INFORMADO]') {
    y = addFieldValueOnly(doc, 'Outras Informações', data.outras_informacoes, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
