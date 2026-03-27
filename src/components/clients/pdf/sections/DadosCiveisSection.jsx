import { 
  addFieldRow,
  addFieldMultiline,
  addSectionTitle,
  PAGE_CONFIG,
  SPACING 
} from '@/utils/pdfExporter';

export function DadosCiveisSection(doc, dados, y, addHeaderFn = null, headerTitle = '') {
  y = addSectionTitle(doc, 'Dados do Processo Cível', y, PAGE_CONFIG.MARGIN_LEFT, addHeaderFn, headerTitle);

  if (dados.parte_adversa) {
    const pa = dados.parte_adversa;
    y = addFieldMultiline(doc, 'Parte Adversa', pa.nome, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    y = addFieldRow(doc, 'CPF/CNPJ', pa.cpf_cnpj, '', '', y);
    if (pa.endereco && pa.endereco !== '-' && pa.endereco !== '[NÃO INFORMADO]') {
      y = addFieldMultiline(doc, 'Endereço', pa.endereco, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
    }
  }

  if (dados.fatos_cronologia) {
    y = addFieldMultiline(doc, 'Fatos e Cronologia', dados.fatos_cronologia, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  if (dados.expectativa_pedido) {
    y = addFieldMultiline(doc, 'Expectativa/Pedido', dados.expectativa_pedido, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  if (dados.urgencias_riscos) {
    y = addFieldMultiline(doc, 'Urgências/Riscos', dados.urgencias_riscos, y, PAGE_CONFIG.MARGIN_LEFT, null, addHeaderFn, headerTitle);
  }

  return y + SPACING.PARAGRAPH_SPACING;
}
