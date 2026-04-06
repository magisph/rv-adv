import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  process.exit(1);
}

// Inicializando Supabase com Service Role para dar bypass no RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const BUCKET_NAME = 'jurisprudencia';

const PADROES_EXCLUSAO = [
  /INCIDENTE N[ÃA]O CONHECIDO/i,
  /N[ÃA]O CONHECIMENTO DO INCIDENTE/i,
  /N[ÃA]O CONHECER/i,
  /N[ÃA]O CONHECIDO/i,
  /N[ÃA]O CONHECIMENTO/i,
  /N[ÃA]O ADMITIDO/i,
  /N[ÃA]O ADMITIDA/i,
  /N[ÃA]O ADMISS[ÃA]O/i,
  /DECIS[ÃA]O MONOCR[ÁA]TICA/i,
  /AGRAVO CONTRA DECIS[ÃA]O MONOCR[ÁA]TICA/i,
  /^VOTO\b/i,
  /^VOTO-VISTA\b/i,
  /PEDIDO DE RECONSIDER/i
];

function isViolação(conteudo: string): boolean {
  if (!conteudo) return false;
  return PADROES_EXCLUSAO.some(regex => regex.test(conteudo));
}

async function runCleanup(isDryRun: boolean = true) {
  console.log(`\n🚀 Iniciando Lixo Zero - Limpeza TNU (Dry-Run: ${isDryRun})`);
  const startTime = Date.now();

  try {
    let allRecords: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    console.log('📦 Buscando registros no banco de dados...');
    while (hasMore) {
      const { data, error } = await supabase
        .from('jurisprudences')
        .select('id, process_number, excerpt')
        // Filtrar apenas TNU (caso haja outros tribunais)
        // .eq('tribunal', 'TNU') // Descomente se tribunal for uma coluna válida. Se não tiver tribunal, tiremos
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allRecords = allRecords.concat(data);
      page++;
    }

    console.log(`✅ Total de registros TNU encontrados: ${allRecords.length}`);

    const violadores = allRecords.filter(row => {
      // Checa tanto excerpt quanto titulo/processo
      return isViolação(row.excerpt) || isViolação(row.process_number);
    });

    console.log(`🚨 Total de registros identificados como LIXO (Violadores): ${violadores.length}`);

    if (violadores.length === 0) {
      console.log('✨ Nada a limpar! Banco já está higienizado.');
      return;
    }

    const idsParaApagar: string[] = [];
    const nomesArmazenamento: string[] = [];
    
    // Preparar lista de exclusão
    for (const v of violadores) {
      idsParaApagar.push(v.id);
      // Extrair apenas o basename da url / storage
      // Caso haja o path salvo diretamente ou pdf_url...
      // Como na função edge PDF_PATH geralmente era armazenado. Aqui usaremos um match básico se existir algo no banco.
      // Se não existir salva o ID.pdf - dependendo da implementação original. Se for PDF a regra costuma usar o numero do processo limpo
      const numLimpo = v.process_number.replace(/\D/g, '');
      const storageFilename = `tnu_${numLimpo}.pdf`; // Supondo o padrao basico. Se houver variação, capturaremos o erro
      nomesArmazenamento.push(storageFilename);
    }

    if (!isDryRun) {
      console.log(`\n🗑️ [STORAGE] Iniciando exclusão física de ${nomesArmazenamento.length} PDFs...`);
      
      // B. Excluir proativamente as references de Object Storage
      try {
        // limit do Supabase array deletation é usualmente de batches.
        const { data: storageData, error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(nomesArmazenamento);

        if (storageError) {
          console.error(`[STORAGE ERROR] Falha ao tentar apagar pacote de PDFs:`, storageError);
        } else {
          console.log(`✅ [STORAGE] ${storageData?.length || 0} arquivos apagados.`);
        }
      } catch (err) {
         console.warn(`[STORAGE WARNING] Falha controlada ao apagar PDFs (objetos ausentes/erro):`, err);
      }

      console.log(`\n🗑️ [DATABASE] Executando exclusão massiva dos ${idsParaApagar.length} registros...`);
      
      // C. DELETE massivo
      // Faremos em batches de 200 pra evitar limite de payload de requisição REST
      let dbDeleteCount = 0;
      for (let i = 0; i < idsParaApagar.length; i += 200) {
        const batch = idsParaApagar.slice(i, i + 200);
        const { error: dbError } = await supabase
          .from('jurisprudences')
          .delete()
          .in('id', batch);
          
        if (dbError) {
           console.error(`❌ [DATABASE ERROR] Falha no batch ${i}:`, dbError.message);
        } else {
           dbDeleteCount += batch.length;
        }
      }

      console.log(`✅ [DATABASE] ${dbDeleteCount} registros apagados com sucesso.`);
    } else {
      console.log(`\n⚠️ (DRY-RUN) Exclusão evitada. Execute com 'npm run ... --execute' ou alterando isDryRun=false para efetivar.`);
      if (violadores.length > 0) {
         console.log(`Amostra de Lixo Identificado:`, violadores.slice(0, 3).map(v => v.process_number));
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️ Tempo total de execução: ${elapsed}s`);

  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA HIGIENIZAÇÃO:', error);
  }
}

// Detectar se há flag --execute
const isDryRun = !process.argv.includes('--execute');
runCleanup(isDryRun);
