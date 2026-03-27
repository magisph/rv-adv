import { 
  addFieldRow,
  addFieldMultiline,
  addSectionTitle,
  SPACING 
} from '@/utils/pdfExporter';

export function DadosCiveisSection(doc, dados, y) {
  y = addSectionTitle(doc, 'Dados do Processo Cível', y);

  if (dados.parte_adversa) {
    const pa = dados.parte_adversa;
    y = addFieldMultiline(doc, 'Parte Adversa', pa.nome || '-', y);
    y = addFieldRow(doc, 'CPF/CNPJ', pa.cpf_cnpj || '-', '', '', y);
    if (pa.endereco) {
      y = addFieldMultiline(doc, 'Endereço', pa.endereco, y);
    }
  }

  if (dados.fatos_cronologia) {
    y = addFieldMultiline(doc, 'Fatos e Cronologia', dados.fatos_cronologia, y);
  }

  if (dados.expectativa_pedido) {
    y = addFieldMultiline(doc, 'Expectativa/Pedido', dados.expectativa_pedido, y);
  }

  if (dados.urgencias_riscos) {
    y = addFieldMultiline(doc, 'Urgências/Riscos', dados.urgencias_riscos, y);
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
