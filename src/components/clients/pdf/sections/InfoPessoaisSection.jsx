import { COLORS, FONTS, addField, addFieldMultiline } from '@/utils/pdfExporter';

export function InfoPessoaisSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  y = addField(doc, 'Nome Completo', data.full_name, y, 16, halfWidth - 5);
  y = addField(doc, 'CPF', data.cpf_cnpj, y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  y = addField(doc, 'Data de Nascimento', data.data_nascimento, y, 16, halfWidth - 5);
  y = addField(doc, 'RG', data.rg || '-', y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  y = addField(doc, 'Órgão Expedidor', data.orgao_expedidor || '-', y, 16, halfWidth - 5);
  y = addField(doc, 'Estado Civil', data.estado_civil || '-', y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  y = addField(doc, 'Escolaridade', data.grau_escolaridade || '-', y, 16, halfWidth - 5);
  y = addField(doc, 'Profissão', data.profissao || '-', y - 8, 16 + halfWidth, halfWidth - 5);
  y += 8;

  return y + 4;
}
