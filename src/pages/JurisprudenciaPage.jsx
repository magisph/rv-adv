// ============================================================================
// JurisprudenciaPage.jsx — Módulo de Pesquisa Jurisprudencial Semântica (TNU)
// Skill: senior-frontend (React Query, Suspense, error boundaries, a11y)
// Skill: react-typescript (prop types, controlled state, event handlers)
// Skill: coding-standards (named exports, JSDoc, consistent naming)
// ============================================================================
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buscarJurisprudencia,
  chatJurisprudencia,
  listarJurisprudencias,
  dispararScrapingTNU,
  JURISPRUDENCIA_QUERY_KEYS,
} from '@/services/jurisprudenciaService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Search,
  MessageSquare,
  FileText,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Componente: Card de Acórdão ──────────────────────────────────────────────

/**
 * Exibe um acórdão com número, data, relator, tema, ementa e link para PDF.
 * @param {{ acordao: object, showSimilarity?: boolean }} props
 */
function AcordaoCard({ acordao, showSimilarity = false }) {
  const similarityPct = acordao.similarity
    ? `${(acordao.similarity * 100).toFixed(1)}%`
    : null;

  return (
    <article
      className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
      aria-label={`Acórdão ${acordao.process_number}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-base truncate">
            {acordao.process_number || 'Processo não informado'}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {acordao.publication_date
              ? new Date(acordao.publication_date).toLocaleDateString('pt-BR')
              : 'Data não informada'}
            {acordao.relator && ` · Rel. ${acordao.relator}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showSimilarity && similarityPct && (
            <Badge variant="secondary" className="text-xs">
              {similarityPct}
            </Badge>
          )}
          {acordao.pdf_path && (
            <Button
              variant="outline"
              size="sm"
              asChild
              aria-label={`Abrir PDF do processo ${acordao.process_number}`}
            >
              <a
                href={acordao.pdf_path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {acordao.tema && (
        <Badge variant="outline" className="mb-2 text-xs">
          {acordao.tema}
        </Badge>
      )}

      {acordao.excerpt && (
        <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed">
          {acordao.excerpt}
        </p>
      )}
    </article>
  );
}

// ─── Componente: Estado vazio ─────────────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <BookOpen className="w-12 h-12 mb-4 opacity-40" aria-hidden="true" />
      <p className="text-base">{message}</p>
    </div>
  );
}

// ─── Componente: Estado de erro ───────────────────────────────────────────────

function ErrorState({ message }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
    >
      <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Aba: Busca Semântica ─────────────────────────────────────────────────────

function AbaBuscaSemantica() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const {
    data: resultados,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: JURISPRUDENCIA_QUERY_KEYS.search(submittedQuery),
    queryFn: () => buscarJurisprudencia(submittedQuery, 10),
    enabled: submittedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    retry: 1,
  });

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (trimmed.length > 0) {
        setSubmittedQuery(trimmed);
      }
    },
    [query]
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: Requisitos para concessão de benefício por incapacidade"
          className="flex-1"
          aria-label="Consulta jurisprudencial"
          maxLength={2000}
        />
        <Button
          type="submit"
          disabled={isFetching || query.trim().length === 0}
          className="shrink-0"
        >
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="w-4 h-4" aria-hidden="true" />
          )}
          <span className="ml-2">{isFetching ? 'Buscando...' : 'Buscar'}</span>
        </Button>
      </form>

      {isError && (
        <ErrorState message={error?.message ?? 'Erro ao realizar busca. Tente novamente.'} />
      )}

      {!isFetching && !isError && resultados && resultados.length === 0 && submittedQuery && (
        <EmptyState message="Nenhum acórdão encontrado para esta consulta." />
      )}

      {!isFetching && !isError && !submittedQuery && (
        <EmptyState message="Digite uma consulta para pesquisar na base de jurisprudência da TNU." />
      )}

      {resultados && resultados.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado
            {resultados.length !== 1 ? 's' : ''} para{' '}
            <span className="font-medium text-slate-700">"{submittedQuery}"</span>
          </p>
          {resultados.map((acordao) => (
            <AcordaoCard key={acordao.id} acordao={acordao} showSimilarity />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Aba: Chat RAG ────────────────────────────────────────────────────────────

function AbaChatRAG() {
  const [pergunta, setPergunta] = useState('');
  const [historico, setHistorico] = useState([]);

  const mutation = useMutation({
    mutationFn: (query) => chatJurisprudencia(query, 5),
    onSuccess: (data, query) => {
      setHistorico((prev) => [
        ...prev,
        { pergunta: query, resposta: data.resposta, fontes: data.fontes },
      ]);
      setPergunta('');
    },
  });

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = pergunta.trim();
      if (trimmed.length > 0 && !mutation.isPending) {
        mutation.mutate(trimmed);
      }
    },
    [pergunta, mutation]
  );

  return (
    <div className="space-y-6">
      {/* Histórico de conversas */}
      {historico.length > 0 && (
        <div className="space-y-6">
          {historico.map((item, idx) => (
            <div key={idx} className="space-y-3">
              {/* Pergunta do usuário */}
              <div className="flex justify-end">
                <div className="bg-legal-blue text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                  <p className="text-sm">{item.pergunta}</p>
                </div>
              </div>

              {/* Resposta do assistente */}
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {item.resposta}
                  </p>
                  {item.fontes && item.fontes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">
                        Fontes ({item.fontes.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.fontes.map((fonte) => (
                          <Badge
                            key={fonte.id}
                            variant="outline"
                            className="text-xs cursor-default"
                            title={`Similaridade: ${fonte.similarity ? (fonte.similarity * 100).toFixed(1) + '%' : 'N/A'}`}
                          >
                            {fonte.process_number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {historico.length === 0 && (
        <EmptyState message="Faça uma pergunta jurídica sobre a jurisprudência da TNU." />
      )}

      {mutation.isError && (
        <ErrorState
          message={mutation.error?.message ?? 'Erro ao processar pergunta. Tente novamente.'}
        />
      )}

      {/* Input de pergunta */}
      <form onSubmit={handleSubmit} className="flex gap-3 sticky bottom-0 bg-slate-50 pt-2">
        <Input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Faça uma pergunta jurídica..."
          className="flex-1"
          aria-label="Pergunta jurídica"
          maxLength={2000}
          disabled={mutation.isPending}
        />
        <Button
          type="submit"
          disabled={mutation.isPending || pergunta.trim().length === 0}
          className="shrink-0"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
          )}
          <span className="ml-2">{mutation.isPending ? 'Processando...' : 'Perguntar'}</span>
        </Button>
      </form>
    </div>
  );
}

// ─── Aba: Base de Dados ───────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function AbaBaseDados({ isAdmin }) {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const {
    data,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: JURISPRUDENCIA_QUERY_KEYS.list(page, PAGE_SIZE),
    queryFn: () => listarJurisprudencias(page, PAGE_SIZE),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev, // Mantém dados anteriores durante paginação
  });

  const scrapingMutation = useMutation({
    mutationFn: () => dispararScrapingTNU('aposentadoria por incapacidade', 0, 10),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jurisprudencia', 'list'] });
      alert(
        `Scraping concluído!\n✅ Coletados: ${result.coletados}\n📊 Total TNU: ${result.total_tnu}\n${result.proximo_disponivel ? '▶️ Há mais páginas disponíveis.' : '✔️ Todos os resultados coletados.'}`
      );
    },
    onError: (err) => {
      alert(`Erro no scraping: ${err.message}`);
    },
  });

  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4">
      {/* Header com contagem e botão de scraping (admin only) */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {data?.count != null ? (
            <>
              <span className="font-medium text-slate-700">{data.count.toLocaleString('pt-BR')}</span>{' '}
              acórdão{data.count !== 1 ? 's' : ''} na base
            </>
          ) : (
            'Carregando...'
          )}
        </p>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrapingMutation.mutate()}
            disabled={scrapingMutation.isPending}
            aria-label="Iniciar scraping de acórdãos da TNU"
          >
            {scrapingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            {scrapingMutation.isPending ? 'Coletando...' : 'Coletar TNU'}
          </Button>
        )}
      </div>

      {isError && (
        <ErrorState message={error?.message ?? 'Erro ao carregar base de dados.'} />
      )}

      {isFetching && !data && (
        <div className="flex justify-center py-12" aria-live="polite" aria-label="Carregando">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {data?.data && data.data.length === 0 && !isFetching && (
        <EmptyState message="Nenhum acórdão na base de dados. Use 'Coletar TNU' para importar." />
      )}

      {data?.data && data.data.length > 0 && (
        <>
          <div className="space-y-3">
            {data.data.map((acordao) => (
              <AcordaoCard key={acordao.id} acordao={acordao} />
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-slate-500">
                Página {page + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isFetching}
                aria-label="Próxima página"
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ABAS = [
  { id: 'busca', label: 'Busca Semântica', icon: Search },
  { id: 'chat', label: 'Chat Jurídico', icon: MessageSquare },
  { id: 'base', label: 'Base de Dados', icon: BookOpen },
];

/**
 * Página de pesquisa jurisprudencial semântica da TNU.
 * Integra busca vetorial, chat RAG e gestão da base de acórdãos.
 */
export default function JurisprudenciaPage() {
  const [abaAtiva, setAbaAtiva] = useState('busca');

  // Obtém role do usuário para exibir controles admin
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    staleTime: Infinity, // Já carregado pelo Layout
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'advogado';

  return (
    <main className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-legal-blue rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Jurisprudência TNU</h1>
            <p className="text-sm text-slate-500">
              Pesquisa semântica vetorial na base de acórdãos da Turma Nacional de Uniformização
            </p>
          </div>
        </div>
      </div>

      {/* Abas de navegação */}
      <nav
        className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6"
        role="tablist"
        aria-label="Seções da jurisprudência"
      >
        {ABAS.map((aba) => {
          const Icon = aba.icon;
          const isActive = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${aba.id}`}
              onClick={() => setAbaAtiva(aba.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center
                ${isActive
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }
              `}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {aba.label}
            </button>
          );
        })}
      </nav>

      {/* Painéis de conteúdo */}
      <div
        id={`panel-${abaAtiva}`}
        role="tabpanel"
        aria-labelledby={abaAtiva}
      >
        {abaAtiva === 'busca' && <AbaBuscaSemantica />}
        {abaAtiva === 'chat' && <AbaChatRAG />}
        {abaAtiva === 'base' && <AbaBaseDados isAdmin={isAdmin} />}
      </div>
    </main>
  );
}
