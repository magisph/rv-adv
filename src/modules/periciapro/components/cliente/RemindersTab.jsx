import React, { useState } from "react";
import { lembreteService } from "@/modules/periciapro/services/lembreteService";
import { activityLogService } from "@/modules/periciapro/services/activityLogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Circle,
  Calendar,
  Trash2,
  Plus,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function RemindersTab({ reminders, periciaId, onUpdate }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    titulo: "",
    data_lembrete: "",
  });

  const handleCreate = async () => {
    if (!newReminder.titulo || !newReminder.data_lembrete) return;

    await lembreteService.create({
      ...newReminder,
      pericia_id: periciaId,
      concluido: false,
    });

    await activityLogService.create({
      pericia_id: periciaId,
      type: "reminder",
      description: `Lembrete criado: ${newReminder.titulo}`,
    });

    setNewReminder({ titulo: "", data_lembrete: "" });
    setIsDialogOpen(false);
    onUpdate();
  };

  const toggleStatus = async (reminder) => {
    await lembreteService.update(reminder.id, {
      concluido: !reminder.concluido,
    });
    onUpdate();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir lembrete?")) return;
    await lembreteService.delete(id);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-900">
          Lembretes e Tarefas
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Lembrete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Lembrete</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>O que precisa ser feito?</Label>
                <Input
                  value={newReminder.titulo}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, titulo: e.target.value })
                  }
                  placeholder="Ex: Ligar para cliente"
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={newReminder.data_lembrete}
                  onChange={(e) =>
                    setNewReminder({
                      ...newReminder,
                      data_lembrete: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {reminders.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            Nenhum lembrete para este caso.
          </p>
        ) : (
          reminders.map((reminder) => (
            <Card
              key={reminder.id}
              className={
                reminder.concluido ? "bg-slate-50 opacity-75" : "bg-white"
              }
            >
              <CardContent className="p-4 flex items-center gap-4">
                <button onClick={() => toggleStatus(reminder)}>
                  {reminder.concluido ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300 hover:text-blue-500" />
                  )}
                </button>
                <div className="flex-1">
                  <p
                    className={`font-medium ${reminder.concluido ? "text-slate-500 line-through" : "text-slate-900"}`}
                  >
                    {reminder.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(reminder.data_lembrete), "dd 'de' MMMM", {
                      locale: ptBR,
                    })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(reminder.id)}
                >
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
