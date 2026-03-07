import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';

/**
 * Função responsável por baixar um molde de documento Word, preenchê-lo
 * com as variáveis dos dados do cliente, baixá-lo no navegador e enviar uma
 * cópia ao Supabase associada ao cliente em background.
 *
 * @param {string} templateUrl URL do template .docx para baixar.
 * @param {object} clientData Objeto contendo os dados do cliente para as chaves (ex: full_name).
 * @param {string} templateName Nome sugestivo para o arquivo de saída.
 * @returns {Promise<Blob>} Retorna o blob final gerado.
 */
export async function generateClientDocument(templateUrl, clientData, templateName) {
  try {
    // 1. Baixa o arquivo do molde .docx (precisa ser URL acessível)
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      throw new Error(`Falha ao baixar o template: ${response.statusText}`);
    }
    
    // Converte a resposta em Array Buffer (suportado pelo PizZip)
    const arrayBuffer = await response.arrayBuffer();

    // 2. Carrega o arquivo binário no ambiente PizZip
    const zip = new PizZip(arrayBuffer);

    // 3. Inicializa o Docxtemplater manipulando o Zip
    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: function() { return ""; }
      });
    } catch (error) {
      // Capturando eventuais erros de Zip/Inicialização antes do parse real
      throw new Error(`Erro ao carregar estrutura do template. Zip inválido: ${error.message}`);
    }

    // Processa a renderização fazendo a substituição das chaves {{nome_chave}}
    // pelo conteúdo nos dados do clientData fornecidos
    try {
      const addressParts = [clientData.address, clientData.city, clientData.state].filter(Boolean).join(", ");
      const cepPart = clientData.zip_code ? `CEP: ${clientData.zip_code}` : "";
      
      const templateData = {
        FULL_NAME: clientData.full_name || "",
        estado_civil: clientData.estado_civil || "",
        profisssao: clientData.profissao || "",
        cpf: clientData.cpf_cnpj || "",
        RG: clientData.rg || "",
        endereco_completo: [addressParts, cepPart].filter(Boolean).join(" - ") || "",
        data: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date())
      };

      doc.render(templateData);
    } catch (error) {
      // Pega e trata os erros de formatação explícitos do Word/tags
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
          .map((e) => e.properties.explanation)
          .join('\n');
        throw new Error(`Erro ao renderizar chaves no template:\n${errorMessages}`);
      }
      throw error;
    }

    // 4. Extrai e gera o novo documento preenchido como Blob
    const blob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });

    // Montar nome seguro. Se clientData tiver UUID, utilizamos parte dele, senão usa timestamp
    const clientIdShort = clientData.id ? clientData.id.split('-').pop() : Date.now();
    const finalFileName = `${templateName}_${clientIdShort}.docx`;

    // 5. Instiga o download do arquivo instantaneamente pelo navegador
    saveAs(blob, finalFileName);

    // 6. Inicia a subida em background do arquivo para o bucket do cliente Supabase e registro do document
    uploadAndLinkDocumentBackground(blob, finalFileName, clientData).catch((err) => {
      console.error('Falha silenciosa no envio do arquivo em background para Supabase: ', err);
    });

    // É uma boa prática retornar o próprio formato (Blob) pro chamador, para permitir manuseios caso se queira visualizar dps
    return blob;

  } catch (err) {
    console.error('Erro na cadeia de geração de documento: ', err);
    throw err;
  }
}

/**
 * Função assíncrona executada "em background" (sem await no fluxo principal) 
 * que faz os envios e inserções ao Supabase.
 */
async function uploadAndLinkDocumentBackground(blob, fileName, clientData) {
  try {
    if (!clientData.id) {
       console.warn('Documento não teve backup pq o Client ID não existe no payload recebido.');
       return;
    }

    // Caminho da pasta no Bucket: clientes/{client_id}/{nome_do_arquivo}
    const storagePath = `${clientData.id}/${fileName}`;
    
    // Faz o upload no bucket configurado na Fase 1
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(storagePath, blob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro de storage: ${uploadError.message}`);
    }

    // Busca a public URL para registrar
    const { data: publicUrlData } = supabase.storage
      .from('client-documents')
      .getPublicUrl(uploadData.path);

    // Cria registro de histórico/vínculo do cliente utilizando formato similar ao app atual
    const recordPayload = {
      parent_type: 'client',
      parent_id: clientData.id,
      name: fileName,
      description: `Documento de template processado para download local (${fileName})`,
      file_url: publicUrlData.publicUrl 
    };

    const { error: insertError } = await supabase
      .from('documents')
      .insert([recordPayload]);

    if (insertError) {
      throw new Error(`Erro no insert à base documents: ${insertError.message}`);
    }

    console.log(`Documento processado ${fileName} vinculado ao cliente ${clientData.id} com êxito em Background!`);

  } catch (error) {
    console.error('Erro no upload e vinculo no background:', error);
    throw error;
  }
}
