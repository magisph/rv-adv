import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Loader2,
  Search,
} from 'lucide-react';
import { trf5BaseSearchSchema } from '@/lib/validation/schemas/jurisprudenciaSchema';
import { JURISPRUDENCIA_QUERY_KEYS, listarJurisprudenciasTRF5CE } from '@/services/jurisprudenciaService';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
  startBr: '01/01/2025',
  endBr: '05/05/2026',
};

const DAILY_SYNC_START_BR = '06/05/2026';
const PAGE_SIZE = 10;

function formatDateToYMD(dateStr) {
  if (!dateStr) return undefined;
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

function formatIsoToBr(dateStr) {
  if (!dateStr) return 'Data nao informada';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function ResultCard({ item }) {
  const [copiado, setCopiado] = useState(false);
  const sourceLabel = [item.source, item.jurisdicao].filter(Boolean).join('/');
  const availableText = item.full_text || item.excerpt || '';
  const previewText = item.excerpt || item.full_text || 'Teor nao disponivel neste registro.';

  const handleCopiar = () => {
    const textToCopy = [
      `Fonte: ${sourceLabel || 'TRF5/CE'}`,
      `Processo: ${item.process_number || 'Nao informado'}`,
      `Data: ${formatIsoToBr(item.trial_date)}`,
      `Relator: ${item.relator || 'Nao informado'}`,
      `Orgao julgador: ${item.orgao_julgador || 'Nao informado'}`,
      '',
      availableText || 'Teor nao disponivel neste registro.',
    ].join('\n');

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
                  Conteudo unico
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 text-base break-words">
              {item.process_number || 'Processo nao informado'}
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
            aria-label="Copiar teor do julgado TRF5/CE"
            title="Copiar teor disponivel"
            className="shrink-0"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="ml-1.5 text-xs">{copiado ? 'Copiado!' : 'Copiar'}</span>
          </Button>
        </div>
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${availableText ? 'text-slate-700' : 'text-slate-400 italic'}`}>
          {previewText}
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-4" aria-live="polite">
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
  );
}

export function TRF5SearchPanel() {
  const [filters, setFilters] = useState({
    termo_busca: '',
    data_julgamento_inicio: '',
    data_julgamento_fim: '',
  });
  const [page, setPage] = useState(0);

  const form = useForm({
    resolver: zodResolver(trf5BaseSearchSchema),
    defaultValues: filters,
  });

  const queryFilters = {
    termo: filters.termo_busca.trim(),
    startDate: formatDateToYMD(filters.data_julgamento_inicio),
    endDate: formatDateToYMD(filters.data_julgamento_fim),
  };

  const {
    data,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: JURISPRUDENCIA_QUERY_KEYS.trf5CE(page, PAGE_SIZE, queryFilters),
    queryFn: () => listarJurisprudenciasTRF5CE(page, PAGE_SIZE, queryFilters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 0;

  const onSubmit = (values) => {
    setPage(0);
    setFilters(values);
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
                Consulte julgados da Turma Recursal do Ceara ja importados para a Base Interna.
                A atualizacao da base e feita automaticamente por rotina tecnica diaria.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit">
              Base Interna
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <CalendarDays className="w-4 h-4 text-legal-blue mb-2" aria-hidden="true" />
              <p className="text-xs uppercase tracking-wide text-slate-500">Importacao historica</p>
              <p className="text-sm font-medium text-slate-800">
                {HISTORICAL_RANGE.startBr} a {HISTORICAL_RANGE.endBr}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <Clock className="w-4 h-4 text-legal-blue mb-2" aria-hidden="true" />
              <p className="text-xs uppercase tracking-wide text-slate-500">Atualizacao diaria</p>
              <p className="text-sm font-medium text-slate-800">A partir de {DAILY_SYNC_START_BR}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="termo_busca"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>Buscar na Base Interna</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Processo, relator, orgao julgador ou teor"
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
                <div className="flex items-end">
                  <Button type="submit" disabled={isFetching} className="w-full">
                    {isFetching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" aria-hidden="true" />
                    )}
                    Consultar
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isError && (
        <Alert variant="destructive">
          <FileText className="w-4 h-4" aria-hidden="true" />
          <AlertTitle>Falha ao consultar a Base Interna</AlertTitle>
          <AlertDescription>{error?.message ?? 'Tente novamente em instantes.'}</AlertDescription>
        </Alert>
      )}

      {isFetching && !data && <LoadingCards />}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-legal-blue" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">
              {data.count.toLocaleString('pt-BR')} julgado{data.count !== 1 ? 's' : ''} TRF5/CE na Base Interna.
            </p>
          </div>

          {data.data.length === 0 && !isFetching && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Nenhum julgado TRF5/CE encontrado na Base Interna para os filtros informados.
            </div>
          )}

          {data.data.length > 0 && (
            <div className="space-y-3">
              {data.data.map((item, index) => (
                <ResultCard key={item.id ?? `${item.process_number}-${index}`} item={item} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
                aria-label="Pagina anterior"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-slate-500">
                Pagina {page + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isFetching}
                aria-label="Proxima pagina"
              >
                Proxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
