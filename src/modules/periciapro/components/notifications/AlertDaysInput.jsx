import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export default function AlertDaysInput({ days, onChange, label }) {
  const [newDay, setNewDay] = useState("");

  const handleAdd = () => {
    const day = parseInt(newDay);
    if (!isNaN(day) && day > 0 && !days.includes(day)) {
      onChange([...days, day].sort((a, b) => b - a));
      setNewDay("");
    }
  };

  const handleRemove = (dayToRemove) => {
    onChange(days.filter((d) => d !== dayToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {days.map((day) => (
          <Badge
            key={day}
            variant="secondary"
            className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            {day} {day === 1 ? "dia" : "dias"}
            <button
              onClick={() => handleRemove(day)}
              className="ml-1 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          value={newDay}
          onChange={(e) => setNewDay(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar dias (ex: 60)"
          className="w-40"
          min="1"
        />
        <Button onClick={handleAdd} type="button" variant="outline" size="icon">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Digite o número de dias e pressione Enter para adicionar um novo alerta.
      </p>
    </div>
  );
}
