import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Database,
  FileText,
  Loader2,
  Play,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { trf5SearchSchema } from '@/lib/validation/schemas/jurisprudenciaSchema';
import { JURISPRUDENCIA_QUERY_KEYS, scrapeTRF5 } from '@/services/jurisprudenciaService';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const HISTORICAL_RANGE = {
  startDate: '2025-01-01',
  endDate: '2026-05-05',
  startBr: '01/01/2025',
  endBr: '05/05/2026',
};

const DAILY_SYNC_START_BR = '06/05/2026';
const HISTORY_CONFIRMATION = 'IMPORTAR TRF5';

const METRIC_LABELS = [
  ['found', 'Encontrados'],
  ['normalized', 'Normalizados'],
  ['inserted', 'Inseridos'],
  ['updated', 'Atualizados'],
  ['ignored', 'Ignorados'],
  ['duplicateExact', 'Duplicados exatos'],
  ['duplicateSimilarity', 'Duplicados semânticos'],
  ['unique', 'Únicos'],
  ['errors', 'Erros'],
  ['portalRequests', 'Requisições ao portal'],
];

function formatDateToYMD(dateStr) {
  if (!dateStr) return undefined;
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

function formatIsoToBr(dateStr) {
  if (!dateStr) return 'Data não informada';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function parseTerms(value) {
  return value
    .split(';')
    .map((term) => term.trim())
    .filter(Boolean);
}

function metricValue(metrics, key) {
  if (key === 'truncated') return metrics?.truncated ? 'Sim' : 'Não';
  return metrics?.[key] ?? 0;
}

function ResultCard({ item }) {
  const [copiado, setCopiado] = useState(false);
  const sourceLabel = [item.source, item.jurisdicao].filter(Boolean).join('/');

  const handleCopiar = () => {
    const textToCopy = [
      `Fonte: ${sourceLabel || 'TRF5/CE'}`,
      `Órgão julgador: ${item.orgao_julgador || 'Não informado'}`,
      `Processo: ${item.process_number || 'Não informado'}`,
      `Relator: ${item.relator || 'Não informado'}`,
      `Data do Julgamento: ${formatIsoToBr(item.trial_date)}`,
      '',
      item.excerpt || item.full_text || '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs uppercase">
                {sourceLabel || 'TRF5/CE'}
              </Badge>
              {item.orgao_julgador && (
                <Badge variant="secondary" className="text-xs">
                  {item.orgao_julgador}
                </Badge>
              )}
              {item.is_unique_teor && (
                <Badge variant="secondary" className="text-xs bg-legal-blue/10 text-legal-blue">
                  Conteúdo único
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 text-base break-words">
              {item.process_number || 'Processo não informado'}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatIsoToBr(item.trial_date)}
              {item.relator && ` · Rel. ${item.relator}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopiar}
            aria-label="Copiar ementa do julgado TRF5/CE"
            title="Copiar ementa completa"
            className="shrink-0"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="ml-1.5 text-xs">{copiado ? 'Copiado!' : 'Copiar'}</span>
          </Button>
        </div>
        {item.excerpt || item.full_text ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {item.excerpt || item.full_text}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic">
            Item retornado pela coleta sem prévia de ementa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricsGrid({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-legal-blue" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-800">Métricas da execução</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {METRIC_LABELS.map(([key, label]) => (
          <div key={key} className="rounded-md border border-slate-200 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{metricValue(metrics, key)}</p>
          </div>
        ))}
        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Truncado</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{metricValue(metrics, 'truncated')}</p>
        </div>
      </div>
      {(metrics.startDate || metrics.endDate || metrics.mode) && (
        <p className="mt-3 text-xs text-slate-500">
          Modo {metrics.mode || 'não informado'} · janela {metrics.startDate || 'início automático'} até{' '}
          {metrics.endDate || 'fim automático'}
        </p>
      )}
    </div>
  );
}

export function TRF5SearchPanel() {
  const [results, setResults] = useState(null);
  const [historicalConfirmation, setHistoricalConfirmation] = useState('');
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(trf5SearchSchema),
    defaultValues: {
      orgao: 'TRU',
      uf: 'CE',
      termo_busca: 'aposentadoria por idade rural',
      data_julgamento_inicio: DAILY_SYNC_START_BR,
      data_julgamento_fim: '',
      maxPagesPerTerm: 5,
    },
  });

  const mutation = useMutation({
    mutationFn: ({ payload }) => scrapeTRF5(payload),
    onSuccess: (data, variables) => {
      toast.success(variables.successMessage);
      queryClient.invalidateQueries({ queryKey: JURISPRUDENCIA_QUERY_KEYS.root });
      setResults({
        metrics: data.metrics ?? {},
        items: data.items ?? [],
        errorSamples: data.errorSamples ?? [],
      });
    },
    onError: (error) => {
      const message = error.message || 'Ocorreu um erro ao executar a coleta TRF5/CE.';
      toast.error(message);
      setResults({
        error: message,
        metrics: null,
        items: [],
        errorSamples: [],
      });
    },
  });

  const isHistoricalConfirmed = historicalConfirmation.trim() === HISTORY_CONFIRMATION;
  const metricSummary = useMemo(() => {
    const metrics = results?.metrics;
    if (!metrics) return null;
    const changed = (metrics.inserted ?? 0) + (metrics.updated ?? 0);
    return {
      changed,
      total: metrics.found ?? 0,
      hasErrors: (metrics.errors ?? 0) > 0,
    };
  }, [results]);

  const runPayload = (payload, successMessage) => {
    setResults(null);
    mutation.mutate({ payload, successMessage });
  };

  const onSubmit = (values) => {
    const payload = {
      mode: 'manual_range',
      terms: parseTerms(values.termo_busca),
      maxPagesPerTerm: values.maxPagesPerTerm,
    };

    const startDate = formatDateToYMD(values.data_julgamento_inicio);
    const endDate = formatDateToYMD(values.data_julgamento_fim);
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;

    runPayload(payload, 'Coleta manual TRF5/CE concluída.');
  };

  const handleSmallTest = () => {
    runPayload(
      {
        mode: 'manual_range',
        terms: ['aposentadoria por idade rural'],
        startDate: '2026-05-06',
        endDate: '2026-05-06',
        maxPagesPerTerm: 1,
      },
      'Teste pequeno TRF5/CE concluído.'
    );
  };

  const handleHistoricalImport = () => {
    runPayload(
      {
        mode: 'initial_import',
        startDate: HISTORICAL_RANGE.startDate,
        endDate: HISTORICAL_RANGE.endDate,
      },
      'Importação histórica TRF5/CE concluída.'
    );
    setHistoricalConfirmation('');
  };

  return (
    <section className="space-y-6" aria-labelledby="trf5-panel-title">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle id="trf5-panel-title" className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-legal-blue" aria-hidden="true" />
                TRF5/CE — Turma Recursal
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                Coleta julgados da Turma Recursal do Ceará, grava na Base Interna, gera embeddings
                e aplica deduplicação exata e semântica antes de disponibilizar os acórdãos.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit">
              Base Interna
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <CalendarDays className="w-4 h-4 text-legal-blue mb-2" aria-hidden="true" />
              <p className="text-xs uppercase tracking-wide text-slate-500">Importação histórica</p>
              <p className="text-sm font-medium text-slate-800">
                {HISTORICAL_RANGE.startBr} a {HISTORICAL_RANGE.endBr}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <Clock className="w-4 h-4 text-legal-blue mb-2" aria-hidden="true" />
              <p className="text-xs uppercase tracking-wide text-slate-500">Rotina diária</p>
              <p className="text-sm font-medium text-slate-800">Ativa a partir de {DAILY_SYNC_START_BR}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <ShieldCheck className="w-4 h-4 text-legal-blue mb-2" aria-hidden="true" />
              <p className="text-xs uppercase tracking-wide text-slate-500">Segurança</p>
              <p className="text-sm font-medium text-slate-800">Execução protegida no backend</p>
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <AlertTitle>Coleta protegida</AlertTitle>
            <AlertDescription>
              A Edge Function valida o JWT e permite execução apenas para service role ou equipe
              jurídica autorizada. Usuários comuns não conseguem contornar a autorização do backend.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="orgao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Órgão</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-slate-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-slate-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="termo_busca"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Termo de busca</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: aposentadoria rural; BPC LOAS"
                          maxLength={120}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_julgamento_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data inicial</FormLabel>
                      <FormControl>
                        <Input placeholder="DD/MM/AAAA" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_julgamento_fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data final</FormLabel>
                      <FormControl>
                        <Input placeholder="DD/MM/AAAA" inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxPagesPerTerm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de páginas por termo</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={50} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSmallTest}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  Teste pequeno
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" disabled={mutation.isPending}>
                      <Database className="w-4 h-4 mr-2" aria-hidden="true" />
                      Importar período histórico
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar importação histórica TRF5/CE</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação solicita a coleta de {HISTORICAL_RANGE.startBr} a{' '}
                        {HISTORICAL_RANGE.endBr}. Digite {HISTORY_CONFIRMATION} para liberar o botão.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      value={historicalConfirmation}
                      onChange={(event) => setHistoricalConfirmation(event.target.value)}
                      placeholder={HISTORY_CONFIRMATION}
                      aria-label="Confirmação da importação histórica TRF5"
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setHistoricalConfirmation('')}>
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleHistoricalImport}
                        disabled={!isHistoricalConfirmed}
                      >
                        Confirmar importação
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  {mutation.isPending ? 'Executando...' : 'Buscar manualmente'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {mutation.isPending && (
        <div className="space-y-4" aria-live="polite">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-legal-blue" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">
              Consultando o portal, gerando embeddings e aplicando deduplicação...
            </p>
          </div>
          {[...Array(3)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && !mutation.isPending && (
        <div className="space-y-4">
          {results.error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <AlertTitle>Falha na coleta TRF5/CE</AlertTitle>
              <AlertDescription>{results.error}</AlertDescription>
            </Alert>
          )}

          {metricSummary && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-legal-blue" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">
                {metricSummary.changed > 0
                  ? `${metricSummary.changed} registro(s) inserido(s) ou atualizado(s) na Base Interna.`
                  : `Execução concluída com ${metricSummary.total} item(ns) encontrado(s), sem novas inserções.`}
                {metricSummary.hasErrors ? ' Há erros amostrados abaixo.' : ''}
              </p>
            </div>
          )}

          <MetricsGrid metrics={results.metrics} />

          {results.errorSamples?.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <AlertTitle>Amostras de erro</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1">
                  {results.errorSamples.map((sample) => (
                    <li key={sample}>{sample}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {results.items?.length > 0 && (
            <div className="space-y-3">
              {results.items.map((item, index) => (
                <ResultCard key={item.id ?? `${item.process_number}-${index}`} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
