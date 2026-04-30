// ============================================================================
// JurisprudenciaPage.jsx — Módulo de Pesquisa Jurisprudencial Semântica (TNU)
// Skill: senior-frontend (React Query, Suspense, error boundaries, a11y)
// Skill: react-typescript (prop types, controlled state, event handlers)
// Skill: coding-standards (named exports, JSDoc, consistent naming)
//
// DESIGN DECISIONS:
// - Coleta de acórdãos é 100% automatizada via GitHub Actions (cron diário 03h BRT)
// - Não há botão manual de coleta — o usuário não precisa interagir para manter a base
// - Ementas são exibidas COMPLETAS (sem line-clamp) para facilitar cópia em peças
// - Filtro: apenas acórdãos reais (sem decisões monocráticas, sem votos)
// - Ordenação: data do julgamento (trial_date) decrescente
// ============================================================================
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buscarJurisprudencia,
  chatJurisprudencia,
  listarJurisprudencias,
  createChatSession,
  listChatSessions,
  loadSessionMessages,
  deleteChatSession,
  JURISPRUDENCIA_QUERY_KEYS,
} from '@/services/jurisprudenciaService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Search,
  MessageSquare,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Clock,
  Database,
  Plus,
  Trash2,
  History,
  Scale
} from 'lucide-react';

import { TRF5SearchPanel } from '@/components/jurisprudencia/TRF5SearchPanel';

// ─── Componente: Card de Acórdão ──────────────────────────────────────────────

/**
 * Exibe um acórdão com número, data, relator, tema e EMENTA COMPLETA.
 * O botão "Copiar" facilita copiar a ementa para uso em peças jurídicas.
 * @param {{ acordao: object, showSimilarity?: boolean }} props
 */
function AcordaoCard({ acordao, showSimilarity = false }) {
  const [copiado, setCopiado] = useState(false);

  const similarityPct = acordao.similarity
    ? `${(acordao.similarity * 100).toFixed(1)}%`
    : null;

  // Usa trial_date com fallback para publication_date
  const dataJulgamento = acordao.trial_date || acordao.publication_date;

  const handleCopiar = useCallback(() => {
    const linhas = [
      `Processo: ${acordao.process_number || 'Não informado'}`,
      dataJulgamento
        ? `Data do Julgamento: ${new Date(dataJulgamento).toLocaleDateString('pt-BR')}`
        : null,
      acordao.relator ? `Relator(a): ${acordao.relator}` : null,
      acordao.tema ? `Tema: ${acordao.tema}` : null,
      '',
      acordao.excerpt || '',
    ].filter((l) => l !== null);

    navigator.clipboard.writeText(linhas.join('\n')).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }, [acordao, dataJulgamento]);

  return (
    <article
      className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
      aria-label={`Acórdão ${acordao.process_number}`}
    >
      {/* Cabeçalho do card */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-base break-words">
            {acordao.process_number || 'Processo não informado'}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {dataJulgamento
              ? new Date(dataJulgamento).toLocaleDateString('pt-BR')
              : 'Data não informada'}
            {acordao.relator && ` · Rel. ${acordao.relator}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showSimilarity && similarityPct && (
            <Badge variant="secondary" className="text-xs">
              {similarityPct} relevância
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopiar}
            aria-label={`Copiar ementa do processo ${acordao.process_number}`}
            title="Copiar ementa completa para área de transferência"
          >
            {copiado ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="ml-1.5 text-xs">{copiado ? 'Copiado!' : 'Copiar'}</span>
          </Button>
        </div>
      </div>

      {/* Tema */}
      {acordao.tema && (
        <Badge variant="outline" className="mb-3 text-xs">
          {acordao.tema}
        </Badge>
      )}

      {/* Ementa COMPLETA — sem line-clamp, exibição integral para facilitar cópia */}
      {acordao.excerpt ? (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {acordao.excerpt}
        </p>
      ) : (
        <p className="text-sm text-slate-400 italic">Ementa não disponível.</p>
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
    staleTime: 5 * 60 * 1000,
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

// ─── Componente: Painel lateral de sessões ────────────────────────────────────

function SessionSidebar({ sessions, currentSessionId, onSelect, onDelete, onNew, isLoading }) {
  const fmt = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
      <div className="p-3 border-b border-slate-200">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={onNew}
          aria-label="Iniciar nova conversa"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova conversa
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6 px-3">
            Nenhuma conversa ainda.
          </p>
        )}

        {sessions.map((sess) => (
          <div
            key={sess.id}
            className={`group flex items-center gap-1 px-2 py-1.5 mx-1 my-0.5 rounded cursor-pointer transition-colors ${
              sess.id === currentSessionId
                ? 'bg-white shadow-sm text-slate-800 font-medium'
                : 'text-slate-600 hover:bg-white/70'
            }`}
            onClick={() => onSelect(sess)}
            role="button"
            tabIndex={0}
            aria-label={`Abrir: ${sess.title}`}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(sess)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{sess.title}</p>
              <p className="text-[10px] text-slate-400">{fmt(sess.updated_at)}</p>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all shrink-0"
              onClick={(e) => { e.stopPropagation(); onDelete(sess.id); }}
              aria-label={`Excluir conversa: ${sess.title}`}
              title="Excluir conversa"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─── Aba: Chat RAG com memória persistente ────────────────────────────────────

function AbaChatRAG() {
  const queryClient = useQueryClient();
  const [pergunta, setPergunta] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const pendingSessionRef = useRef(null);

  // Listar sessões do usuário
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: JURISPRUDENCIA_QUERY_KEYS.sessions(),
    queryFn: listChatSessions,
    staleTime: 60_000,
  });

  // Scroll automático para última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Mutation: envio de pergunta com criação lazy de sessão
  const mutation = useMutation({
    mutationFn: async (query) => {
      let sid = currentSessionId;
      if (!sid) {
        const session = await createChatSession(query);
        sid = session.id;
        setCurrentSessionId(sid);
      }
      return chatJurisprudencia(query, 5, sid);
    },
    onMutate: (query) => {
      setMensagens((prev) => [...prev, { role: 'user', content: query, _pending: true }]);
      setPergunta('');
    },
    onSuccess: (data) => {
      setMensagens((prev) => {
        const withoutPending = prev.map((m) => m._pending ? { ...m, _pending: false } : m);
        return [...withoutPending, { role: 'assistant', content: data.resposta, fontes: data.fontes }];
      });
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      queryClient.invalidateQueries({ queryKey: JURISPRUDENCIA_QUERY_KEYS.sessions() });
    },
    onError: () => {
      setMensagens((prev) => prev.filter((m) => !m._pending));
    },
  });

  // Mutation: deletar sessão
  const deleteMutation = useMutation({
    mutationFn: deleteChatSession,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: JURISPRUDENCIA_QUERY_KEYS.sessions() });
      if (deletedId === currentSessionId) {
        setCurrentSessionId(null);
        setMensagens([]);
      }
    },
  });

  // Selecionar sessão existente: carrega mensagens do BD
  const handleSelectSession = useCallback(async (sess) => {
    if (sess.id === currentSessionId) return;
    setCurrentSessionId(sess.id);
    setMensagens([{ role: '_loading', content: '' }]);
    pendingSessionRef.current = sess.id;
    try {
      const msgs = await loadSessionMessages(sess.id);
      if (pendingSessionRef.current === sess.id) {
        setMensagens(msgs.map((m) => ({ role: m.role, content: m.content })));
      }
    } catch {
      if (pendingSessionRef.current === sess.id) {
        setMensagens([]);
      }
    }
  }, [currentSessionId]);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setMensagens([]);
    setPergunta('');
  }, []);

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

  const isLoadingSession = mensagens.some((m) => m.role === '_loading');

  return (
    <div className="flex h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Painel lateral */}
      {sidebarOpen && (
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelect={handleSelectSession}
          onDelete={(id) => deleteMutation.mutate(id)}
          onNew={handleNewChat}
          isLoading={sessionsLoading}
        />
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1 rounded hover:bg-slate-200 transition-colors"
            aria-label={sidebarOpen ? 'Ocultar histórico' : 'Exibir histórico'}
            title="Alternar painel de histórico"
          >
            <History className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">
              {currentSessionId
                ? (sessions.find((s) => s.id === currentSessionId)?.title ?? 'Consulta jurídica')
                : 'Nova consulta'}
            </p>
            <p className="text-[10px] text-slate-400">
              {currentSessionId ? 'Sessão ativa · histórico salvo' : 'Sessão criada ao enviar a 1ª mensagem'}
            </p>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {isLoadingSession && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}

          {!isLoadingSession && mensagens.length === 0 && (
            <EmptyState message="Faça uma pergunta jurídica sobre a jurisprudência da TNU." />
          )}

          {!isLoadingSession && mensagens.map((msg, idx) => (
            <div key={idx}>
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className={`bg-legal-blue text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] ${msg._pending ? 'opacity-70' : ''}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.fontes && msg.fontes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-2">Fontes ({msg.fontes.length}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.fontes.map((fonte) => (
                            <Badge
                              key={fonte.id}
                              variant="outline"
                              className="text-xs cursor-default"
                              title={fonte.similarity ? `Similaridade: ${(fonte.similarity * 100).toFixed(1)}%` : ''}
                            >
                              {fonte.process_number}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {mutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <p className="text-xs text-slate-500">Consultando jurisprudência...</p>
                </div>
              </div>
            </div>
          )}

          {mutation.isError && (
            <ErrorState message={mutation.error?.message ?? 'Erro ao processar pergunta. Tente novamente.'} />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-slate-200 shrink-0">
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
    </div>
  );
}

// ─── Aba: Base de Dados ───────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/**
 * Aba de visualização da base de dados de jurisprudência.
 * A coleta é 100% automatizada via GitHub Actions (cron diário às 03h BRT).
 * Exibe acórdãos com ementa COMPLETA e paginação.
 */
function AbaBaseDados() {
  const [page, setPage] = useState(0);

  const {
    data,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: JURISPRUDENCIA_QUERY_KEYS.list(page, PAGE_SIZE),
    queryFn: () => listarJurisprudencias(page, PAGE_SIZE, 'trial_date'),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4">
      {/* Header: contagem e informação sobre coleta automática */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <p className="text-sm text-slate-700">
              {data?.count != null ? (
                <>
                  <span className="font-semibold text-slate-800">
                    {data.count.toLocaleString('pt-BR')}
                  </span>{' '}
                  acórdão{data.count !== 1 ? 's' : ''} indexado{data.count !== 1 ? 's' : ''}
                </>
              ) : (
                'Carregando...'
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
            <p className="text-xs text-slate-500">
              Coleta automática diária às 03h (horário de Brasília) · Apenas acórdãos com ementa
            </p>
          </div>
        </div>
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
        <EmptyState message="Nenhum acórdão na base de dados. A coleta automática ocorre diariamente às 03h." />
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
  { id: 'base', label: 'Base Interna (TNU)', icon: BookOpen },
  { id: 'trf5', label: 'TRF5 - Ceará', icon: Scale },
  { id: 'busca', label: 'Busca Semântica', icon: Search },
  { id: 'chat', label: 'Chat Jurídico', icon: MessageSquare },
];

/**
 * Página de pesquisa jurisprudencial semântica da TNU.
 * Integra busca vetorial, chat RAG e visualização da base de acórdãos.
 */
export default function JurisprudenciaPage() {
  const [abaAtiva, setAbaAtiva] = useState('base');

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
        {abaAtiva === 'base' && <AbaBaseDados />}
        {abaAtiva === 'trf5' && <TRF5SearchPanel />}
        {abaAtiva === 'busca' && <AbaBuscaSemantica />}
        {abaAtiva === 'chat' && <AbaChatRAG />}
      </div>
    </main>
  );
}
