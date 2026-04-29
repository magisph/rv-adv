import React, { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { enrichBulk } from "@/services/cnjService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Layers,
  Zap,
  CheckCircle2,
  XCircle,
  Scale,
  Building2,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";

// ─── Regex e máscara ─────────────────────────────────────────────────────────

const REGEX_CNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

function mascaraCNJ(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 20);
  if (d.length <= 7) return d;
  let r = d.slice(0, 7) + "-";
  if (d.length <= 9) return r + d.slice(7);
  r += d.slice(7, 9) + ".";
  if (d.length <= 13) return r + d.slice(9);
  r += d.slice(9, 13) + ".";
  if (d.length <= 14) return r + d.slice(13);
  r += d[13] + ".";
  if (d.length <= 16) return r + d.slice(14);
  r += d.slice(14, 16) + ".";
  return r + d.slice(16);
}

function parsearLinhas(texto) {
  return texto
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 50);
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function MetricBadge({ value, label, variant = "default" }) {
  const variants = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    error: "bg-red-100 text-red-700 border-red-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
    default: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-lg border ${variants[variant]}`}>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs font-medium mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

function ProcessoCard({ resultado, index }) {
  const [expandido, setExpandido] = useState(false);
  const movimentos = resultado.movimentos ?? [];
  const movimentosVisiveis = expandido ? movimentos : movimentos.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card
        className={`border ${
          resultado.encontrado
            ? "border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 to-white"
            : "border-red-200/50 bg-red-50/30"
        } shadow-sm hover:shadow-md transition-shadow`}
      >
        <CardContent className="p-4">
          {/* Cabeçalho do card */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-semibold text-slate-800 break-all">
                {resultado.numero}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{resultado.tribunal}</p>
            </div>
            <div className="shrink-0">
              {resultado.encontrado ? (
                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 text-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  Encontrado
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-600 border border-red-200 gap-1 text-xs">
                  <XCircle className="w-3 h-3" />
                  Não encontrado
                </Badge>
              )}
            </div>
          </div>

          {resultado.encontrado && (
            <>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {/* Classe */}
                <div className="flex items-start gap-2">
                  <Scale className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Classe</p>
                    <p className="text-xs font-medium text-slate-800 line-clamp-2">
                      {resultado.classeProcessual?.nome || resultado.classeProcessual || "—"}
                    </p>
                  </div>
                </div>

                {/* Órgão Julgador */}
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Órgão Julgador</p>
                    <p className="text-xs font-medium text-slate-800 line-clamp-2">
                      {resultado.orgaoJulgador?.nome || resultado.orgaoJulgador || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assuntos */}
              {resultado.assuntos?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {resultado.assuntos.slice(0, 3).map((a, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-white/60">
                      {a.nome || a}
                    </Badge>
                  ))}
                  {resultado.assuntos.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{resultado.assuntos.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Movimentos (expansível) */}
              {movimentos.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-1.5">
                    {movimentosVisiveis.map((mov, i) => {
                      const nome =
                        mov?.complementosTabelados?.[0]?.descricao ||
                        mov?.nome ||
                        mov?.movimento ||
                        "Movimentação";
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-600 truncate">{nome}</p>
                        </div>
                      );
                    })}
                  </div>
                  {movimentos.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 h-7 text-xs text-blue-600 hover:text-blue-700 gap-1"
                      onClick={() => setExpandido((v) => !v)}
                    >
                      {expandido ? (
                        <><ChevronUp className="w-3 h-3" /> Mostrar menos</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" /> Ver {movimentos.length - 3} movimentos restantes</>
                      )}
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {resultado.erro && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {resultado.erro}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function RadarBulkDataJud() {
  const [textareaValue, setTextareaValue] = useState("");
  const [resultado, setResultado] = useState(null);

  const linhas = parsearLinhas(textareaValue);
  const validas = linhas.filter((l) => REGEX_CNJ.test(l));
  const invalidas = linhas.filter((l) => !REGEX_CNJ.test(l));

  const mutation = useMutation({
    mutationFn: () => enrichBulk(validas),
    onSuccess: (data) => {
      setResultado(data);
      toast.success(
        `Consulta concluída: ${data.encontrados}/${data.total} processos encontrados em ${data.duracao_ms}ms`,
        { duration: 5000 }
      );
    },
    onError: (err) => {
      toast.error(`Erro na consulta: ${err.message}`, { duration: 8000 });
    },
  });

  const handleConsultar = useCallback(() => {
    if (validas.length === 0) return;
    setResultado(null);
    mutation.mutate();
  }, [validas, mutation]);

  const progressPercent = mutation.isPending ? 50 : resultado ? 100 : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg shadow-violet-500/20">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Consulta em Lote — DataJud
          </h2>
          <p className="text-xs text-slate-500">
            Até 50 processos simultâneos · TJCE &amp; TRF5 · Sem Geo-Block
          </p>
        </div>
        <Badge className="ml-auto bg-violet-100 text-violet-700 border border-violet-200 gap-1">
          <Zap className="w-3 h-3" />
          Alta Performance
        </Badge>
      </div>

      {/* ── Input em lote ──────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Números de Processo (CNJ)
          </CardTitle>
          <p className="text-xs text-slate-500">
            Cole um por linha, separado por vírgula ou ponto e vírgula.
            Formato: <span className="font-mono">NNNNNNN-DD.AAAA.J.TT.OOOO</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            id="bulk-cnj-textarea"
            placeholder={`0001234-56.2023.8.06.0001\n0007890-12.2022.4.05.8100\n0003456-78.2024.8.06.0050`}
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            className="font-mono text-sm min-h-[140px] resize-none"
            disabled={mutation.isPending}
          />

          {/* Status de validação dos números */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validas.length} válido{validas.length !== 1 && "s"}
            </span>
            {invalidas.length > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {invalidas.length} inválido{invalidas.length !== 1 && "s"} (ignorado{invalidas.length !== 1 && "s"})
              </span>
            )}
            {linhas.length > 50 && (
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Limitado a 50 processos (máximo por lote)
              </span>
            )}
          </div>

          <Button
            id="bulk-consultar-btn"
            onClick={handleConsultar}
            disabled={validas.length === 0 || mutation.isPending}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-2 shadow-md"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Consultando {validas.length} processo{validas.length !== 1 && "s"}…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Consultar {validas.length > 0 ? `${validas.length} processo${validas.length !== 1 ? "s" : ""}` : "em lote"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Progress Bar ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(mutation.isPending || resultado) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="space-y-1">
              <Progress
                value={progressPercent}
                className="h-1.5 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-indigo-500 transition-all duration-500"
              />
              <p className="text-xs text-slate-500 text-right">
                {mutation.isPending ? "Consultando o DataJud via Hetzner…" : "Consulta concluída"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Métricas do Lote ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {resultado && !mutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Painel de métricas */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Resultado do Lote
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <MetricBadge
                    value={resultado.total}
                    label="Total consultados"
                    variant="info"
                  />
                  <MetricBadge
                    value={resultado.encontrados}
                    label="Encontrados"
                    variant="success"
                  />
                  <MetricBadge
                    value={resultado.total - resultado.encontrados}
                    label="Não encontrados"
                    variant={resultado.total - resultado.encontrados > 0 ? "error" : "default"}
                  />
                  <MetricBadge
                    value={`${resultado.duracao_ms}ms`}
                    label="Tempo de resposta"
                    variant="default"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Erros de validação/tribunal */}
            {resultado.erros?.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {resultado.erros.length} processo{resultado.erros.length !== 1 && "s"} com erro de consulta
                    </p>
                    <div className="space-y-1">
                      {resultado.erros.map((e, i) => (
                        <p key={i} className="text-xs text-amber-600 font-mono">
                          {e.numero} — {e.erro}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Cards de resultados individuais */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Detalhes por Processo
              </p>
              {resultado.resultados.map((r, i) => (
                <ProcessoCard key={r.numero} resultado={r} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
