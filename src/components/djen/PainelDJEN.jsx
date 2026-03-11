import React from "react";
import { useQuery } from "@tanstack/react-query";
import { djenBuscaPublica, formatarNumeroCNJ } from "@/services/cnjService";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  AlertCircle,
  RefreshCw,
  Scale,
  Building2,
  CalendarDays,
  User,
  Gavel,
  CheckCircle2,
} from "lucide-react";

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
// formatDate — Converte ISO / string de data para DD/MM/YYYY
// ============================================================================
function formatDate(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(raw);
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
function ComunicacaoCard({ comunicacao, lidas, toggleLida }) {
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

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <Card className={`border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${isLida ? 'opacity-60 bg-slate-50' : ''}`}>
      {/* ── Cabeçalho – faixa superior com metadados ───────────────── */}
      <CardHeader className="bg-amber-50/80 border-b border-amber-100 py-3 px-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-700 leading-relaxed flex-1">
            {dataDisp && (
              <span className="font-medium">
                Disponibilizada em {dataDisp}
              </span>
            )}
            {tribunal && (
              <span className="text-slate-400"> · <span className="font-semibold text-[#1e3a5f]">{tribunal}</span></span>
            )}
            <span className="text-slate-400"> · </span>
            <span className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded border border-amber-200">
              {numeroFormatado}
            </span>
            <span className="text-slate-400"> · </span>
            <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs hover:bg-[#1e3a5f]/15 font-medium">
              {tipoAto}
            </Badge>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleLida(cardId)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isLida
                ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${isLida ? 'fill-emerald-100' : ''}`} />
            {isLida ? 'Lida' : 'Marcar como Lida'}
          </Button>
        </div>
      </CardHeader>

      {/* ── Corpo da Comunicação ─────────────────────────────────────── */}
      <CardContent className="p-5 space-y-5">
        {/* Órgão Julgador */}
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-[#c9a227] flex-shrink-0" />
          <h3 className="text-base font-bold text-slate-800">{orgaoJulgador}</h3>
        </div>

        {/* Teor na Íntegra */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
            <Scale className="w-4 h-4 text-[#c9a227]" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Teor na Íntegra
            </span>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap break-words font-sans leading-relaxed">
              {teorExibido}
            </pre>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        {/* Seção: Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Data da Disponibilização
              </p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {dataDisp || "Não informada"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
          <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
          <Building2 className="w-4 h-4 text-[#c9a227] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Advogado(a)
            </p>
            <p className="text-sm font-bold text-[#1e3a5f] mt-0.5">
              ANA RAFAELA VASCONCELOS DAMASCENO{" "}
              <span className="font-normal text-slate-500">(OAB 36.219/CE)</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Painel Principal ──────────────────────────────────────────────────────
export default function PainelDJEN() {
  // Estado persistido de comunicações lidas
  const [lidas, setLidas] = React.useState(() =>
    JSON.parse(localStorage.getItem('djen_lidas') || '[]')
  );

  const toggleLida = (id) => {
    setLidas((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      localStorage.setItem('djen_lidas', JSON.stringify(next));
      return next;
    });
  };
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["djen-comunicacoes"],
    queryFn: djenBuscaPublica,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // ── Loading State ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
            <Inbox className="w-5 h-5 text-[#c9a227]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Caixa de Entrada Oficial
            </h2>
            <p className="text-sm text-slate-500">Consultando o DJEN...</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
            <Inbox className="w-5 h-5 text-[#c9a227]" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Caixa de Entrada Oficial
          </h2>
        </div>
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">
            Erro ao consultar o DJEN
          </AlertTitle>
          <AlertDescription className="mt-1">
            <p className="text-sm">
              {error?.message || "Não foi possível conectar ao servidor do DJEN."}
            </p>
            <p className="text-xs text-red-400 mt-2">
              Verifique se o proxy local (localhost:3001) está ativo.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Success State ────────────────────────────────────────────────────
  const comunicacoes = data?.comunicacoes ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
            <Inbox className="w-5 h-5 text-[#c9a227]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Caixa de Entrada Oficial
            </h2>
            <p className="text-sm text-slate-500">
              Diário de Justiça Eletrônico Nacional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className="border-[#1e3a5f]/30 text-[#1e3a5f] text-sm px-3 py-1"
          >
            OAB: {data?.oab ?? "—"}
          </Badge>
          <Badge className="bg-[#c9a227] text-[#1e3a5f] font-semibold text-sm px-3 py-1 hover:bg-[#c9a227]/90">
            {comunicacoes.length}{" "}
            {comunicacoes.length === 1 ? "publicação" : "publicações"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-slate-600 border-slate-300"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de Comunicações */}
      {comunicacoes.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              Nenhuma publicação encontrada
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Não há comunicações disponíveis no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comunicacoes.map((com, idx) => (
            <ComunicacaoCard key={idx} comunicacao={com} lidas={lidas} toggleLida={toggleLida} />
          ))}
        </div>
      )}
    </div>
  );
}
