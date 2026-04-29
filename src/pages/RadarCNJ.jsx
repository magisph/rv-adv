import React from "react";
import RadarDataJud from "@/components/processes/RadarDataJud";
import RadarBulkDataJud from "@/components/processes/RadarBulkDataJud";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Layers } from "lucide-react";

export default function RadarCNJ() {
  return (
    <div className="space-y-6">
      {/* ── Cabeçalho da página ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Radar CNJ</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sala de controle investigativa — consulta oficial ao DataJud · TJCE &amp; TRF5
        </p>
      </div>

      {/* ── Tabs: Individual e em Lote ── */}
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="individual" className="gap-2 text-sm">
            <Search className="w-3.5 h-3.5" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2 text-sm">
            <Layers className="w-3.5 h-3.5" />
            Em Lote
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="mt-5">
          <RadarDataJud />
        </TabsContent>

        <TabsContent value="bulk" className="mt-5">
          <RadarBulkDataJud />
        </TabsContent>
      </Tabs>
    </div>
  );
}
