import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Search, Check, Copy, AlertCircle, FileText } from 'lucide-react';
import { trf5SearchSchema } from '@/lib/validation/schemas/jurisprudenciaSchema';
import { scrapeTRF5 } from '@/services/jurisprudenciaService';

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

function ResultCard({ item }) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiar = () => {
    const textToCopy = [
      `Processo: ${item.process_number}`,
      `Relator: ${item.relator}`,
      `Data do Julgamento: ${item.trial_date}`,
      '',
      item.excerpt
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
            <h3 className="font-semibold text-slate-800 text-base break-words">
              {item.process_number || 'Processo não informado'}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {item.trial_date || 'Data não informada'}
              {item.relator && ` · Rel. ${item.relator}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.is_unique_teor && (
              <Badge variant="secondary" className="text-xs bg-legal-blue/10 text-legal-blue">
                Conteúdo Único
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiar}
              aria-label="Copiar ementa"
              title="Copiar ementa completa"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="ml-1.5 text-xs">{copiado ? 'Copiado!' : 'Copiar'}</span>
            </Button>
          </div>
        </div>
        {item.excerpt ? (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {item.excerpt}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic">Ementa não disponível.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TRF5SearchPanel() {
  const [results, setResults] = useState(null);

  const form = useForm({
    resolver: zodResolver(trf5SearchSchema),
    defaultValues: {
      orgao: 'TRU',
      uf: 'CE',
      texto_livre: '',
      data_julgamento_inicio: '',
      data_julgamento_fim: '',
    },
  });

  const mutation = useMutation({
    mutationFn: scrapeTRF5,
    onSuccess: (data) => {
      toast.success('Busca no TRF5 concluída com sucesso!');
      setResults({
        total_coletados: data.metrics?.inserted || 0,
        items: [],
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Ocorreu um erro ao buscar no TRF5.');
    },
  });

  const formatDateToYMD = (dateStr) => {
    if (!dateStr) return undefined;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const onSubmit = (values) => {
    // Mapeamento para o contrato da Edge Function
    const payload = {
      pesquisa_livre: values.texto_livre,
      pagina: 1
    };
    
    if (values.data_julgamento_inicio) {
      payload.data_inicio = formatDateToYMD(values.data_julgamento_inicio);
    }
    if (values.data_julgamento_fim) {
      payload.data_fim = formatDateToYMD(values.data_julgamento_fim);
    }

    setResults(null);
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-legal-blue" />
            Nova Pesquisa - Turma Recursal TRF5
          </CardTitle>
          <CardDescription>
            Realize buscas no portal do TRF5 (Ceará) para extrair acórdãos em tempo real.
            Os resultados passarão por deduplicação semântica.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  name="texto_livre"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Texto Livre (obrigatório)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: aposentadoria especial" {...field} />
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
                      <FormLabel>Data de Julgamento Inicial (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="DD/MM/AAAA" {...field} />
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
                      <FormLabel>Data de Julgamento Final (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="DD/MM/AAAA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Buscando no TRF5... (pode levar até 45s)
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Iniciar Busca
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Loading Skeletons */}
      {mutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-legal-blue" />
            <p className="text-sm font-medium text-slate-700">Extraindo e processando dados do portal...</p>
          </div>
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
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

      {/* Resultados */}
      {results && !mutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-legal-blue" />
            <p className="text-sm font-medium text-slate-700">
              {results.total_coletados > 0 
                ? `${results.total_coletados} novos acórdãos coletados e indexados com sucesso.`
                : 'A busca foi concluída, mas nenhum acórdão novo foi coletado (ou todos já existiam na base).'}
            </p>
          </div>

          {results.items && results.items.length > 0 && (
            <div className="space-y-3 mt-4">
              {results.items.map((item, idx) => (
                <ResultCard key={idx} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
