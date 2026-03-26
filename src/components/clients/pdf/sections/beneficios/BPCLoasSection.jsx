import { COLORS, FONTS, addField, addFieldMultiline, addTable, addSectionTitle } from '@/utils/pdfExporter';

export function BPCLoasSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  if (data.elegibilidade) {
    const elig = data.elegibilidade;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Triagem de Elegibilidade', 16, y);
    y += 6;

    y = addField(doc, 'Reside no Brasil', elig.reside_brasil || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'CPF/CadÚnico', elig.cpf_cadunico || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Recebe Benefício', elig.recebe_beneficio || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Vínculo Ativo', elig.vinculo_ativo || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (elig.diagnosticos) {
      y = addFieldMultiline(doc, 'Diagnóstico (CID)', elig.diagnosticos, y, 16, pageWidth - 30);
    }

    if (elig.medico_assistente) {
      y = addField(doc, 'Médico Assistente', elig.medico_assistente, y, 16, pageWidth - 30);
    }

    if (elig.inicio_sintomas) {
      y = addField(doc, 'Início dos Sintomas', elig.inicio_sintomas, y, 16, halfWidth - 5);
    }
    if (elig.impedimento_2_anos) {
      y = addField(doc, 'Impedimento 2+ Anos', elig.impedimento_2_anos, y - 8, 16 + halfWidth, halfWidth - 5);
    }
    y += 8;

    if (elig.natureza_impedimento) {
      y = addField(doc, 'Natureza do Impedimento', elig.natureza_impedimento, y, 16, pageWidth - 30);
    }

    if (elig.tipos_impedimento && elig.tipos_impedimento !== '-') {
      y = addField(doc, 'Tipos de Impedimento', elig.tipos_impedimento, y, 16, pageWidth - 30);
    }

    y += 6;
  }

  if (data.cif) {
    const cif = data.cif;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Classificação Internacional de Funcionalidade (CIF)', 16, y);
    y += 6;

    if (cif.autocuidado && cif.autocuidado !== '-') {
      y = addFieldMultiline(doc, 'Autocuidado', cif.autocuidado, y, 16, pageWidth - 30);
    }
    if (cif.mobilidade && cif.mobilidade !== '-') {
      y = addFieldMultiline(doc, 'Mobilidade', cif.mobilidade, y, 16, pageWidth - 30);
    }
    if (cif.comunicacao && cif.comunicacao !== '-') {
      y = addField(doc, 'Comunicação', cif.comunicacao, y, 16, halfWidth - 5);
    }
    if (cif.cognicao && cif.cognicao !== '-') {
      y = addField(doc, 'Cognição', cif.cognicao, y - 8, 16 + halfWidth, halfWidth - 5);
    }
    y += 8;

    if (cif.interacao_social && cif.interacao_social !== '-') {
      y = addField(doc, 'Interação Social', cif.interacao_social, y, 16, halfWidth - 5);
    }
    if (cif.capacidade_trabalho && cif.capacidade_trabalho !== '-') {
      y = addField(doc, 'Capacidade Trabalho', cif.capacidade_trabalho, y - 8, 16 + halfWidth, halfWidth - 5);
    }
    y += 8;

    if (cif.barreiras && cif.barreiras !== '-') {
      y = addFieldMultiline(doc, 'Barreiras', cif.barreiras, y, 16, pageWidth - 30);
    }
    if (cif.necessita_cuidador) {
      y = addField(doc, 'Necessita Cuidador', cif.necessita_cuidador, y, 16, halfWidth - 5);
    }
    if (cif.tratamentos) {
      y = addFieldMultiline(doc, 'Tratamentos', cif.tratamentos, y, 16, pageWidth - 30);
    }
    if (cif.medicamentos) {
      y = addFieldMultiline(doc, 'Medicamentos', cif.medicamentos, y, 16, pageWidth - 30);
    }

    y += 6;
  }

  if (data.grupo_familiar && data.grupo_familiar.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo Familiar', 16, y);
    y += 6;

    y = addTable(doc, ['Nome', 'CPF', 'Parentesco', 'Nascimento', 'Renda'], 
      data.grupo_familiar.map(m => [m.nome, m.cpf, m.parentesco, m.data_nascimento, m.renda]),
      y
    );
    y += 6;
  }

  if (data.situacao_habitacional) {
    const hab = data.situacao_habitacional;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Situação Habitacional', 16, y);
    y += 6;

    y = addField(doc, 'Origem Residência', hab.origem_residencia || '-', y, 16, halfWidth - 5);
    if (hab.condicoes_imovel && hab.condicoes_imovel !== '-') {
      y = addFieldMultiline(doc, 'Condições do Imóvel', hab.condicoes_imovel, y, 16, pageWidth - 30);
    }
    y += 6;
  }

  if (data.estrategia) {
    const est = data.estrategia;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Estratégia', 16, y);
    y += 6;

    y = addField(doc, 'Viabilidade Adm.', est.viabilidade_adm || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Viabilidade Judicial', est.viabilidade_jud || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (est.proxima_etapa && est.proxima_etapa !== '-') {
      y = addField(doc, 'Próxima Etapa', est.proxima_etapa, y, 16, pageWidth - 30);
    }
    if (est.pendencias && est.pendencias !== '-') {
      y = addFieldMultiline(doc, 'Pendências', est.pendencias, y, 16, pageWidth - 30);
    }
    if (est.fundamentacao && est.fundamentacao !== '-') {
      y = addFieldMultiline(doc, 'Fundamentação', est.fundamentacao, y, 16, pageWidth - 30);
    }
  }

  return y + 4;
}
