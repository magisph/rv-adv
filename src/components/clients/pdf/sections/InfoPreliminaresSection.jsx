import { 
  addFieldRow,
  addFieldMultiline,
  addSectionTitle,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function InfoPreliminaresSection(doc, data, y, addHeaderFn = null, headerTitle = '') {
  y = addSectionTitle(doc, 'Informações Preliminares', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);

  y = addFieldRow(doc, 'Senha MEU INSS', data.senha_meu_inss, 'CadÚnico', data.cad_unico, y);
  y = addFieldRow(doc, 'Senha GOV', data.senha_gov, 'Biometria', data.biometria, y);
  y = addFieldRow(doc, 'Pedido Anterior', data.pedido_anterior, 'NB', data.nb, y);
  
  if (data.processo_judicial && data.processo_judicial !== '-' && data.processo_judicial !== '[NÃO INFORMADO]') {
    y = addFieldMultiline(doc, 'Processo Judicial', data.processo_judicial, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
