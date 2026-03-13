import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { holidayService } from '@/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function HolidayManager() {
  const queryClient = useQueryClient();
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'nacional', state: '', city: '' });

  // Listar Feriados
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await holidayService.getPaginated(1, 1000, [{ column: 'date', ascending: true }]);
      if (error) throw error;
      return data;
    }
  });

  // Criar Feriado
  const createMutation = useMutation({
    mutationFn: (holidayData) => holidayService.create(holidayData),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      toast.success('Feriado adicionado com sucesso!');
      setNewHoliday({ date: '', name: '', type: 'nacional', state: '', city: '' });
    },
    onError: (err) => {
      toast.error('Erro ao adicionar feriado', { description: err.message });
    }
  });

  // Deletar Feriado
  const deleteMutation = useMutation({
    mutationFn: (id) => holidayService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      toast.success('Feriado removido!');
    },
    onError: (err) => {
      toast.error('Erro ao remover feriado', { description: err.message });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name || !newHoliday.type) {
      toast.warn('Preencha os campos obrigatórios (Data, Nome e Tipo).');
      return;
    }
    createMutation.mutate(newHoliday);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Gerenciar Feriados</CardTitle>
        <CardDescription>
          Feriados cadastrados não contam como dias úteis nos prazos processuais (CPC).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2 lg:col-span-1">
              <Label>Data *</Label>
              <Input
                type="date"
                required
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Natal"
                required
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label>Tipo *</Label>
              <Select
                value={newHoliday.type}
                onValueChange={(val) => setNewHoliday({ ...newHoliday, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="estadual">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-1">
              <Button type="submit" disabled={createMutation.isPending} className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]">
                {createMutation.isPending ? 'Salvando...' : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {newHoliday.type !== 'nacional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {['estadual', 'municipal'].includes(newHoliday.type) && (
                 <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input
                      placeholder="Ex: SP"
                      maxLength={2}
                      value={newHoliday.state}
                      onChange={(e) => setNewHoliday({ ...newHoliday, state: e.target.value })}
                    />
                 </div>
               )}
               {newHoliday.type === 'municipal' && (
                  <div className="space-y-2">
                    <Label>Município</Label>
                    <Input
                      placeholder="Ex: São Paulo"
                      value={newHoliday.city}
                      onChange={(e) => setNewHoliday({ ...newHoliday, city: e.target.value })}
                    />
                 </div>
               )}
            </div>
          )}
        </form>

        {/* Lista de Feriados */}
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Cadastrados
          </h3>
          <ScrollArea className="h-[300px] border rounded-md p-4">
            {isLoading ? (
               <div className="text-center text-sm text-slate-500 py-4">Carregando...</div>
            ) : holidays.length === 0 ? (
               <div className="text-center text-sm text-slate-500 py-4">Nenhum feriado cadastrado.</div>
            ) : (
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 w-full gap-2 items-center">
                       <span className="font-medium text-slate-800">
                         {format(parseISO(h.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                       </span>
                       <span className="text-slate-600 truncate">{h.name}</span>
                       <span className="text-xs uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded w-fit">
                         {h.type}
                         {h.state ? ` - ${h.state}` : ''}
                         {h.city ? ` / ${h.city}` : ''}
                       </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(h.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
