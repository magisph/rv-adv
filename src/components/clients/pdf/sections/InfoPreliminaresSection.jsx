import { 
  addFieldRow,
  addFieldMultiline,
  addSectionTitle,
  SPACING 
} from '@/utils/pdfExporter';

export function InfoPreliminaresSection(doc, data, y) {
  y = addSectionTitle(doc, 'Informações Preliminares', y);

  y = addFieldRow(doc, 'Senha MEU INSS', data.senha_meu_inss || '-', 'CadÚnico', data.cad_unico || '-', y);
  y = addFieldRow(doc, 'Senha GOV', data.senha_gov || '-', 'Biometria', data.biometria || '-', y);
  y = addFieldRow(doc, 'Pedido Anterior', data.pedido_anterior || '-', 'NB', data.nb || '-', y);
  
  if (data.processo_judicial && data.processo_judicial !== '-') {
    y = addFieldMultiline(doc, 'Processo Judicial', data.processo_judicial, y);
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
