import { COLORS, FONTS, addField, addFieldMultiline } from '@/utils/pdfExporter';

export function InfoPreliminaresSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  y = addField(doc, 'Senha MEU INSS', data.senha_meu_inss || '-', y, 16, halfWidth - 5);
  y = addField(doc, 'Inscrito CadÚnico', data.inscrito_cadunico || '-', y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  y = addField(doc, 'Possui Senha GOV', data.possui_senha_gov || '-', y, 16, halfWidth - 5);
  y = addField(doc, 'Possui Biometria', data.possui_biometria || '-', y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  y = addField(doc, 'Pedido Anterior INSS/Judicial', data.pedido_anterior_inss || '-', y, 16, halfWidth - 5);

  if (data.pedido_anterior_inss === 'Sim') {
    y = addField(doc, 'NB (Processo Adm.)', data.numero_processo_administrativo || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Processo Judicial', data.numero_processo_judicial || '-', y, 16, halfWidth - 5);

    if (data.observacoes_processos_anteriores) {
      y = addFieldMultiline(doc, 'Observações Processos Anteriores', data.observacoes_processos_anteriores, y, 16, halfWidth * 2 - 5);
    }
  }

  return y + 4;
}
