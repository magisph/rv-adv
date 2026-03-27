import { COLORS, FONTS, addField, addFieldMultiline, addTable } from '@/utils/pdfExporter';

export function SalarioMaternidadeRuralSection(doc, data, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const halfWidth = (pageWidth - 28) / 2;

  if (data.maternidade) {
    const mat = data.maternidade;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações de Maternidade', 16, y);
    y += 6;

    y = addField(doc, 'Tipo de Evento', mat.tipo_evento || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Data do Evento/Parto', mat.data_parto_evento || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Data Prevista Parto', mat.data_prevista_parto || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Gestante Atualmente', mat.gestante_atualmente || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (mat.semanas_gestacao && mat.semanas_gestacao !== '-') {
      y = addField(doc, 'Semanas de Gestação', mat.semanas_gestacao, y, 16, halfWidth - 5);
    }
    
    y = addField(doc, 'Tipo de Parto', mat.tipo_parto || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Primeiro Filho', mat.primeiro_filho || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Nº Filhos', mat.numero_filhos || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Ja Recebeu Salário-Mat.', mat.ja_recebeu || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (mat.detalhes_recebimento && mat.detalhes_recebimento !== '-') {
      y = addFieldMultiline(doc, 'Detalhes Recebimento Anterior', mat.detalhes_recebimento, y, 16, pageWidth - 30);
    }

    y = addField(doc, 'Complicações na Gestação', mat.complicacoes_gestacao || '-', y, 16, halfWidth - 5);
    if (mat.detalhes_complicacoes && mat.detalhes_complicacoes !== '-') {
      y = addFieldMultiline(doc, 'Detalhes Complicações', mat.detalhes_complicacoes, y, 16, pageWidth - 30);
    }

    y = addField(doc, 'Afastou Durante Gestação', mat.afastou_gestacao || '-', y, 16, halfWidth - 5);
    if (mat.periodo_afastamento && mat.periodo_afastamento !== '-') {
      y = addField(doc, 'Período Afastamento', mat.periodo_afastamento, y - 8, 16 + halfWidth, halfWidth - 5);
    }
    y += 8;

    y = addField(doc, 'Trabalhou Período Carência', mat.trabalha_carencia || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Afastou Após Parto', mat.afastou_apos_parto || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    if (mat.data_afastamento_parto && mat.data_afastamento_parto !== '-') {
      y = addField(doc, 'Data Afastamento Pós-Parto', mat.data_afastamento_parto, y, 16, halfWidth - 5);
    }
    y += 4;

    if (mat.filhos_adotados && mat.filhos_adotados.length > 0) {
      y = addTable(doc, ['Nome', 'CPF', 'Data Nasc.', 'Certidão', 'DNV'],
        mat.filhos_adotados.map(f => [f.nome, f.cpf, f.data_nascimento, f.certidao || '-', f.dnv || '-']),
        y
      );
      y += 6;
    }
  }

  if (data.conjuge) {
    const conj = data.conjuge;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações do Cônjuge', 16, y);
    y += 6;

    y = addField(doc, 'Nome', conj.nome || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'CPF', conj.cpf || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Trabalha Rural', conj.trabalha_rural || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Vínculo Urbano', conj.vinculo_urbano || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
  }

  if (data.atividade_rural) {
    const atv = data.atividade_rural;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Atividade Rural', 16, y);
    y += 6;

    y = addField(doc, 'Zona', atv.zona || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Tempo no Local', atv.tempo_local || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Trabalha Desde', atv.trabalha_desde || '-', y, 16, halfWidth - 5);

    if (atv.propriedades && atv.propriedades.length > 0) {
      y += 4;
      y = addTable(doc, ['Propriedade', 'Proprietário', 'Período'],
        atv.propriedades.map(p => [p.nome, p.proprietario || '-', p.periodo]),
        y
      );
    }
    y += 4;
  }

  if (data.membros_familia && data.membros_familia.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo Familiar', 16, y);
    y += 6;

    y = addTable(doc, ['Nome', 'CPF', 'Parentesco'],
      data.membros_familia.map(m => [m.nome, m.cpf, m.parentesco]),
      y
    );
    y += 4;
  }

  if (data.documentacao) {
    const doc_ = data.documentacao;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Documentação Rural', 16, y);
    y += 6;

    y = addField(doc, 'Possui DAP', doc_.dap || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Possui CAF', doc_.caf || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;

    y = addField(doc, 'Filiado ao Sindicato', doc_.filiado_sindicato || '-', y, 16, halfWidth - 5);
    y = addField(doc, 'Filiação Desde', doc_.filiado_desde || '-', y - 8, 16 + halfWidth, halfWidth - 5);
    y += 8;
  }

  if (data.testemunhas && data.testemunhas.length > 0) {
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(FONTS.section);
    doc.setFont('helvetica', 'bold');
    doc.text('Testemunhas', 16, y);
    y += 6;

    y = addTable(doc, ['Nome', 'CPF', 'Telefone', 'Relação', 'Período'],
      data.testemunhas.map(t => [t.nome, t.cpf, t.telefone, t.relacao, t.periodo]),
      y
    );
  }

  if (data.observacoes && data.observacoes !== '-') {
    y += 4;
    y = addFieldMultiline(doc, 'Observações', data.observacoes, y, 16, pageWidth - 30);
  }

  return y + 4;
}
