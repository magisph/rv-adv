import React from "react";
import RadarDataJud from "@/components/processes/RadarDataJud";

export default function RadarCNJ() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Radar CNJ</h1>
        <p className="text-slate-500">
          Sala de controle investigativa — consulta oficial ao DataJud
        </p>
      </div>
      <RadarDataJud />
    </div>
  );
}
