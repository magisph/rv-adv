import React, { useMemo, useEffect } from "react";
import { formatarNumeroCNJ } from "@/services/cnjService";
import useDjenComunicacoes from "@/hooks/useDjenComunicacoes";
import { useAuth } from "@/lib/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Scale,
  Building2,
  CalendarDays,
  User,
  Gavel,
  CheckCircle2,
  Calculator,
  Trash2,
} from "lucide-react";
import { CalculadoraCpcModal } from "./CalculadoraCpcModal";

// ============================================================================
// getField — Extrator blindado contra inconsistência de case nas chaves
// Varre todas as chaves de `obj` comparando em lowercase com o array `keys`.
// Retorna o primeiro valor encontrado ou `fallback`.
// ============================================================================
function getField(obj, keys, fallback = null) {
  if (!obj || typeof obj !== "object") return fallback;

  const objEntries = Object.entries(obj);
  const normalizedKeys = keys.map((k) => k.toLowerCase());

  for (const nk of normalizedKeys) {
    for (const [key, value] of objEntries) {
      if (key.toLowerCase() === nk && value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return fallback;
}

// ============================================================================
// formatDate — Converte ISO / string de data para DD/MM/YYYY (Padrão Pt-BR)
// ============================================================================
function formatDate(data_variavel) {
  if (!data_variavel) return null;

  if (typeof data_variavel === 'string' && data_variavel.includes('/')) {
    const parts = data_variavel.split(/[\/\s]/);
    if (parts.length >= 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return data_variavel; // Retorna como veio se já estiver em padrão visual DD/MM/YYYY validado
    }
  }

  try {
    const d = new Date(data_variavel);
    if (isNaN(d.getTime())) return String(data_variavel);
    
    // Utiliza Intl.DateTimeFormat para pt-BR e timeZone='UTC' 
    // previne que ISO YYYY-MM-DD retroceda um dia pelo offset local do navegador
    return new Intl.DateTimeFormat('pt-BR', { 
      timeZone: 'UTC', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).format(d);
  } catch {
    return String(data_variavel);
  }
}

// ============================================================================
// formatNumero — Tenta formatar o número CNJ; retorna bruto em caso de erro
// ============================================================================
function formatNumero(raw) {
  if (!raw) return "Nº não informado";
  try {
    return formatarNumeroCNJ(String(raw));
  } catch {
    return String(raw);
  }
}

// ─── Skeleton de Carregamento ──────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
          <Skeleton className="h-12 w-full" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card de Comunicação — Layout de Gestão Processual ─────────────────────
// P1: advogadoLogado e oabExibicao vêm do retorno do useDjenComunicacoes,
// eliminando o hardcode e garantindo que exibição reflita o usuário logado.
function ComunicacaoCard({ comunicacao, lidas, toggleLida, toggleExcluida, advogadoLogado, oabExibicao }) {
  const [isCalculadoraOpen, setIsCalculadoraOpen] = React.useState(false);

  // ── Extração blindada de campos ────────────────────────────────────────
  const numeroRaw = getField(comunicacao, [
    "numeroprocesso", "numero_processo", "numero", "processo",
  ]);
  const numeroFormatado = formatNumero(numeroRaw);

  const dataDispRaw = getField(comunicacao, [
    "datadisponibilizacao", "data_disponibilizacao", "datadisponibilizaçao",
  ]);
  const dataPubRaw = getField(comunicacao, [
    "datapublicacao", "data_publicacao", "datapubicacao",
  ]);
  const dataDisp = formatDate(dataDispRaw);
  const dataPub = formatDate(dataPubRaw);

  const tipoAto = getField(comunicacao, [
    "tipocomunicacao", "tipo_comunicacao", "tipo", "tipoato",
  ], "Publicação");

  const tribunal = getField(comunicacao, [
    "siglatribunal", "sigla_tribunal", "tribunal", "nometribunal",
  ], "");

  const orgaoJulgador = getField(comunicacao, [
    "nomeorgao", "nome_orgao", "orgaojulgador", "orgao_julgador",
    "varajudicial", "vara_judicial", "vara", "orgao",
  ], "Órgão não informado");

  const destinatario = getField(comunicacao, [
    "nomedestinatario", "nome_destinatario", "destinatario",
  ], "Não informado");

  const teor = getField(comunicacao, [
    "texto", "conteudo", "teor", "mensagem", "descricao",
  ]);
  const teorExibido = teor || JSON.stringify(comunicacao, null, 2);

  // ── Estado de leitura ──────────────────────────────────────────────
  const cardId = `${numeroFormatado}-${dataDispRaw || 'sem-data'}`;
  const isLida = lidas.includes(cardId);

  const comunicacaoWithRaw = { ...comunicacao, data_disponibilizacao_raw: dataDispRaw };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <Card className={`border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${isLida ? 'bg-emerald-50/60 border-emerald-200' : 'border-slate-200'}`}>
      {/* ── Cabeçalho – faixa superior com metadados ───────────────── */}
      <CardHeader className={`${isLida ? 'bg-emerald-100/50 border-b border-emerald-200' : 'bg-amber-50/80 border-b border-amber-100'} py-3 px-5`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-700 leading-relaxed flex-1">
            {dataDisp && (
              <span className="font-medium">
                Disponibilizada em {dataDisp}
              </span>
            )}
            {tribunal && (
              <span className="text-slate-600"> · <span className="font-semibold text-legal-blue">{tribunal}</span></span>
            )}
            <span className="text-slate-600"> · </span>
            <span className={`font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded border ${isLida ? 'border-emerald-300' : 'border-amber-200'}`}>
              {numeroFormatado}
            </span>
            <span className="text-slate-600"> · </span>
            <Badge className="bg-legal-blue-50 text-legal-blue text-xs hover:bg-legal-blue-100 font-medium">
              {tipoAto}
            </Badge>
          </p>
          <div className="flex items-center gap-2">
            {!isLida ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCalculadoraOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border-slate-200"
                >
                  <Calculator className="w-4 h-4 text-legal-gold" />
                  Calcular Prazo CPC
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLida(cardId)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors text-slate-600 hover:text-slate-600 hover:bg-slate-100"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Marcar como Lida
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExcluida(cardId)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Lida
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExcluida(cardId)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* ── Corpo da Comunicação ─────────────────────────────────────── */}
      <CardContent className="p-5 space-y-5">
        {/* Órgão Julgador */}
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-legal-gold flex-shrink-0" />
          <h3 className="text-base font-bold text-slate-800">{orgaoJulgador}</h3>
        </div>

        {/* Teor na Íntegra */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
            <Scale className="w-4 h-4 text-legal-gold" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Teor na Íntegra
            </span>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            <pre className={`text-sm whitespace-pre-wrap break-words font-sans leading-relaxed ${isLida ? 'text-slate-600' : 'text-slate-700'}`}>
              {teorExibido}
            </pre>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Seção: Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Data da Disponibilização
              </p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {dataDisp || "Não informada"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CalendarDays className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Data da Publicação
              </p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {dataPub || "Não informada"}
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Seção: Destinatários */}
        <div className="flex items-start gap-2.5">
          <User className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Destinatário
            </p>
            <p className="text-sm font-medium text-slate-800 mt-0.5">
              {destinatario}
            </p>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Seção: Advogados */}
        <div className="flex items-start gap-2.5">
          <Building2 className="w-4 h-4 text-legal-gold mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Advogado(a)
            </p>
            {/* P1: consome oabExibicao e advogadoLogado do hook — sem hardcode */}
            <p className="text-sm font-bold text-legal-blue mt-0.5">
              {advogadoLogado || "Advogado(a)"}{" "}
              {oabExibicao && (
                <span className="font-normal text-slate-600">(OAB {oabExibicao})</span>
              )}
            </p>
          </div>
        </div>
      </CardContent>

      {isCalculadoraOpen && (
        <CalculadoraCpcModal 
          isOpen={isCalculadoraOpen} 
          onClose={() => setIsCalculadoraOpen(false)} 
          comunicacao={comunicacaoWithRaw} 
          numeroProcesso={numeroFormatado} 
        />
      )}
    </Card>
  );
}

// ─── Painel Principal ──────────────────────────────────────────────────────
export default function PainelDJEN() {
  // ── P2: Isolamento de localStorage por user.id ──────────────────────────
  // Evita colisão de estado entre advogados diferentes na mesma máquina.
  // React Hook Rule: useAuth() antes de qualquer useState que dependa do user.
  const { user } = useAuth();

  // Chaves isoladas por ID — null enquanto user ainda não carregou
  const lidasKey    = user?.id ? `djen_lidas_${user.id}`    : null;
  const excluídasKey = user?.id ? `djen_excluidas_${user.id}` : null;

  // Inicia vazio — useEffect sincroniza do localStorage quando user.id surgir
  const [lidas, setLidas] = React.useState([]);
  const [excluidas, setExcluidas] = React.useState([]);

  // Carrega do localStorage quando o ID do usuário estiver disponível
  useEffect(() => {
    if (!lidasKey) return;
    try {
      setLidas(JSON.parse(localStorage.getItem(lidasKey) || '[]'));
    } catch {
      setLidas([]);
    }
  }, [lidasKey]);

  useEffect(() => {
    if (!excluídasKey) return;
    try {
      setExcluidas(JSON.parse(localStorage.getItem(excluídasKey) || '[]'));
    } catch {
      setExcluidas([]);
    }
  }, [excluídasKey]);
  // ──────────────────────────────────────────────────────────────────────────

  const toggleLida = (id) => {
    if (!lidasKey) return; // guard: não persiste sem user autenticado
    setLidas((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      localStorage.setItem(lidasKey, JSON.stringify(next));
      return next;
    });
  };

  const toggleExcluida = (id) => {
    if (!excluídasKey) return; // guard: não persiste sem user autenticado
    setExcluidas((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      localStorage.setItem(excluídasKey, JSON.stringify(next));
      return next;
    });
  };

  const {
    data: djenData,
    isLoading,
    error,
    refetch,
  } = useDjenComunicacoes();

  // ── Hooks must be declared before any early return (Rules of Hooks) ─────────────
  // Transform DJEN API response to match what ComunicacaoCard expects
  const comunicacoes = useMemo(() => {
    if (!djenData?.comunicacoes) return [];
    return djenData.comunicacoes.map(com => ({
      numero_processo: getField(com, ["numeroprocesso", "numero_processo", "numero", "processo"]),
      data_disponibilizacao: getField(com, ["datadisponibilizacao", "data_disponibilizacao"]),
      data_publicacao: getField(com, ["datapublicacao", "data_publicacao"]),
      conteudo: getField(com, ["texto", "conteudo", "teor", "mensagem", "descricao"]),
      tipo_comunicacao: getField(com, ["tipocomunicacao", "tipo_comunicacao", "tipo", "tipoato"], "Intimação"),
      sigla_tribunal: getField(com, ["siglatribunal", "sigla_tribunal", "tribunal"], ""),
      nome_orgao: getField(com, ["nomeorgao", "nome_orgao", "orgaojulgador"]),
      nome_destinatario: getField(com, ["nomedestinatario", "nome_destinatario"]),
      ...com
    }));
  }, [djenData]);

  // Memoize filtered list — heavy iteration with getField() calls per item
  const comunicacoesFiltradas = useMemo(
    () =>
      comunicacoes.filter((com) => {
        const dataDispRaw = getField(com, [
          "datadisponibilizacao", "data_disponibilizacao", "datadisponibilizaçao",
        ]);
        const numeroRaw = getField(com, [
          "numeroprocesso", "numero_processo", "numero", "processo",
        ]);
        const cardId = `${formatNumero(numeroRaw)}-${dataDispRaw || 'sem-data'}`;
        return !excluidas.includes(cardId);
      }),
    [comunicacoes, excluidas]
  );

  // ── Loading State ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-legal-blue rounded-lg flex items-center justify-center">
            <Inbox className="w-5 h-5 text-legal-gold" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Caixa de Entrada Oficial
            </h2>
            <p className="text-sm text-slate-600">Sincronizando intimações...</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Inbox className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Caixa de Entrada Oficial
            </h2>
            <p className="text-sm text-slate-600">
              Erro ao carregar intimações
            </p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="text-red-500 mb-4">
              <Inbox className="w-12 h-12" />
            </div>
            <p className="text-red-700 font-medium text-center mb-2">
              Não foi possível carregar as comunicações do DJEN
            </p>
            <p className="text-red-600 text-sm text-center mb-4 max-w-md">
              {error.message || "Erro desconhecido. Verifique sua conexão e tente novamente."}
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success State ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-legal-blue rounded-lg flex items-center justify-center">
            <Inbox className="w-5 h-5 text-legal-gold" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Caixa de Entrada Oficial
            </h2>
            <p className="text-sm text-slate-600">
              Diário de Justiça Eletrônico Nacional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className="border-legal-blue-200 text-legal-blue text-sm px-3 py-1"
          >
            Sincronização Ativa (TI)
          </Badge>
          <Badge className="bg-legal-gold-500 text-legal-blue-900 font-semibold text-sm px-3 py-1 hover:bg-legal-gold-600">
            {comunicacoes.length}{" "}
            {comunicacoes.length === 1 ? "publicação" : "publicações"}
          </Badge>
        </div>
      </div>

      {/* Lista de Comunicações */}
      {comunicacoes.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">
              Nenhuma publicação encontrada
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Não há comunicações disponíveis no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comunicacoesFiltradas.map((com, idx) => (
            <ComunicacaoCard
              key={idx}
              comunicacao={com}
              lidas={lidas}
              toggleLida={toggleLida}
              toggleExcluida={toggleExcluida}
              advogadoLogado={djenData?.advogado}
              oabExibicao={djenData?.oabExibicao}
            />
          ))}
        </div>
      )}
    </div>
  );
}
