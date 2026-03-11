import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { datajudBuscaNumero, formatarNumeroCNJ } from "@/services/cnjService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Radar,
  Search,
  Loader2,
  AlertTriangle,
  Scale,
  Building2,
  ArrowDownCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Tenta formatar uma data ISO vinda do DataJud */
function fmtData(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Formata a entrada do input enquanto digita (máscara CNJ) */
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

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function ResultCard({ icon: Icon, label, children, accentColor = "blue" }) {
  const colors = {
    blue: "from-blue-500/10 to-blue-600/5 border-blue-200/60",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-200/60",
    violet: "from-violet-500/10 to-violet-600/5 border-violet-200/60",
  };
  const iconColors = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    violet: "text-violet-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`border bg-gradient-to-br ${colors[accentColor]} shadow-sm hover:shadow-md transition-shadow`}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-5 h-5 ${iconColors[accentColor]}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </span>
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TimelineItem({ mov, index }) {
  const nome =
    mov?.complementosTabelados?.[0]?.descricao ||
    mov?.nome ||
    mov?.movimento ||
    "Movimentação";
  const data = fmtData(mov?.dataHora);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="relative pl-7 pb-6 last:pb-0 group"
    >
      {/* Linha vertical */}
      <span className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-slate-200 group-last:hidden" />
      {/* Dot */}
      <span className="absolute left-0 top-[6px] w-[18px] h-[18px] rounded-full bg-white border-2 border-blue-400 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
      </span>
      {/* Content */}
      <div>
        <p className="text-sm font-medium text-slate-800 leading-snug">
          {nome}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {data}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Componente Principal ───────────────────────────────────────────────────

export default function RadarDataJud() {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [showAllMov, setShowAllMov] = useState(false);

  const digitosLimpos = inputValue.replace(/\D/g, "");
  const isReady = digitosLimpos.length === 20;

  async function handleBuscar() {
    if (!isReady) return;
    setLoading(true);
    setResultado(null);
    setErro(null);

    try {
      const res = await datajudBuscaNumero(digitosLimpos);
      if (!res.encontrado) {
        setErro(
          `Processo ${res.numero} não encontrado na base do ${res.tribunal}.`
        );
      } else {
        setResultado(res);
      }
    } catch (err) {
      const msg = err?.message || "Erro desconhecido";
      if (msg.includes("Tribunal não mapeado")) {
        setErro(
          "⚠️ Este número pertence a um tribunal fora da jurisdição do escritório (TJCE / TRF5)."
        );
      } else {
        setErro(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleBuscar();
  }

  const movimentos = resultado?.movimentos ?? [];
  const movimentosVisiveis = showAllMov
    ? movimentos
    : movimentos.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/20">
          <Radar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Radar de Processos
          </h2>
          <p className="text-xs text-slate-500">
            Consulta oficial no DataJud · TJCE &amp; TRF5
          </p>
        </div>
      </div>

      {/* ── Input de busca ──────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <label className="text-sm font-medium text-slate-700 mb-2 block">
            Número do Processo (CNJ)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                id="radar-cnj-input"
                placeholder="0000000-00.0000.0.00.0000"
                value={inputValue}
                onChange={(e) => setInputValue(mascaraCNJ(e.target.value))}
                onKeyDown={handleKeyDown}
                className="pl-10 font-mono tracking-wide text-base"
                maxLength={25}
                autoComplete="off"
              />
            </div>
            <Button
              id="radar-buscar-btn"
              onClick={handleBuscar}
              disabled={!isReady || loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a87] min-w-[160px] gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando…
                </>
              ) : (
                <>
                  <Radar className="w-4 h-4" />
                  Buscar no CNJ
                </>
              )}
            </Button>
          </div>
          {digitosLimpos.length > 0 && !isReady && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {20 - digitosLimpos.length} dígitos restantes
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Loading State ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-3" />
                  <div className="h-6 w-64 bg-slate-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Erro ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {erro && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border border-red-200 bg-red-50/60 shadow-sm">
              <CardContent className="p-5 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">
                    Busca sem resultado
                  </p>
                  <p className="text-sm text-red-600 mt-1">{erro}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Resultado ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {resultado && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border border-green-200 gap-1 text-xs">
                <CheckCircle2 className="w-3 h-3" />
                Encontrado
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-xs"
              >
                {resultado.tribunal}
              </Badge>
              {resultado.grau && (
                <Badge variant="outline" className="text-xs">
                  {resultado.grau}
                </Badge>
              )}
            </div>

            {/* Cards de informação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Classe Processual */}
              <ResultCard
                icon={Scale}
                label="Classe Processual"
                accentColor="blue"
              >
                <p className="text-base font-semibold text-slate-800">
                  {resultado.classeProcessual?.nome ||
                    resultado.classeProcessual ||
                    "—"}
                </p>
                {resultado.classeProcessual?.codigo && (
                  <p className="text-xs text-slate-400 mt-1">
                    Código: {resultado.classeProcessual.codigo}
                  </p>
                )}
              </ResultCard>

              {/* Órgão Julgador */}
              <ResultCard
                icon={Building2}
                label="Órgão Julgador"
                accentColor="emerald"
              >
                <p className="text-base font-semibold text-slate-800">
                  {resultado.orgaoJulgador?.nome ||
                    resultado.orgaoJulgador ||
                    "—"}
                </p>
                {resultado.orgaoJulgador?.codigo && (
                  <p className="text-xs text-slate-400 mt-1">
                    Código: {resultado.orgaoJulgador.codigo}
                  </p>
                )}
              </ResultCard>
            </div>

            {/* Assuntos */}
            {resultado.assuntos?.length > 0 && (
              <ResultCard
                icon={ArrowDownCircle}
                label="Assuntos"
                accentColor="violet"
              >
                <div className="flex flex-wrap gap-2">
                  {resultado.assuntos.map((a, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs bg-white/60"
                    >
                      {a.nome || a}
                    </Badge>
                  ))}
                </div>
              </ResultCard>
            )}

            {/* Timeline de movimentos */}
            {movimentos.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Movimentações
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {movimentos.length} registro{movimentos.length !== 1 && "s"}
                    </Badge>
                  </div>

                  <Separator className="mb-4" />

                  <div>
                    {movimentosVisiveis.map((mov, i) => (
                      <TimelineItem key={i} mov={mov} index={i} />
                    ))}
                  </div>

                  {movimentos.length > 8 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3 text-blue-600 hover:text-blue-700 gap-1"
                      onClick={() => setShowAllMov((v) => !v)}
                    >
                      {showAllMov ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Mostrar menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver todas ({movimentos.length})
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
