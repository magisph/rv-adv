import React from "react";
import PainelDJEN from "@/components/djen/PainelDJEN";

export default function IntimacoesDJEN() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">DJEN Oficial</h1>
        <p className="text-slate-600">
          Intimações e publicações do Diário de Justiça Eletrônico Nacional
        </p>
      </div>
      <PainelDJEN />
    </div>
  );
}
