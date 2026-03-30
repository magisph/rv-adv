import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, X, Calendar as CalendarIcon, Bell } from "lucide-react";
import { format, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * @typedef {Object} AppointmentFormProps
 * @property {Object} [appointment] - Dados do compromisso para edição
 * @property {string} [clientId] - ID do cliente
 * @property {string} [clientName] - Nome do cliente
 * @property {Function} onSave - Callback para salvar o formulário
 * @property {Function} onCancel - Callback para cancelar
 * @property {boolean} [isSaving] - Estado de salvamento
 */
export default function AppointmentForm({ 
  /** @type {Object|undefined} */ appointment, 
  /** @type {string|undefined} */ clientId, 
  /** @type {string|undefined} */ clientName, 
  /** @type {Function} */ onSave, 
  /** @type {Function} */ onCancel, 
  /** @type {boolean|undefined} */ isSaving 
}) {
  const [formData, setFormData] = useState({
    client_id: clientId || "",
    client_name: clientName || "",
    date: new Date().toISOString(),
    title: "",
    notes: "",
    status: "agendado",
    location: "",
    alerts_enabled: false,
    alert_days: [],
    ...appointment
  });

  const [selectedDate, setSelectedDate] = useState(
    appointment?.date ? new Date(appointment.date) : new Date()
  );

  // CORRIGIDO: Stale closure - usando setter funcional para evitar dependência de formData
  useEffect(() => {
    if (appointment) {
      setFormData(prev => ({ ...prev, ...appointment }));
      if (appointment.date) {
        setSelectedDate(new Date(appointment.date));
      }
    }
  }, [appointment]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDateTimeChange = useCallback((date) => {
    setSelectedDate(date);
    setFormData(prev => {
      const time = prev.date ? new Date(prev.date).toTimeString().slice(0, 5) : "09:00";
      const dateTime = new Date(date);
      const [hours, minutes] = time.split(":");
      dateTime.setHours(parseInt(hours), parseInt(minutes));
      return { ...prev, date: dateTime.toISOString() };
    });
  }, []);

  const handleTimeChange = useCallback((time) => {
    setFormData(prev => {
      const dateTime = new Date(selectedDate);
      const [hours, minutes] = time.split(":");
      dateTime.setHours(parseInt(hours), parseInt(minutes));
      return { ...prev, date: dateTime.toISOString() };
    });
  }, [selectedDate]);

  const handleAlertDayToggle = useCallback((day) => {
    setFormData(prev => {
      const alertDays = prev.alert_days || [];
      const newAlertDays = alertDays.includes(day)
        ? alertDays.filter(d => d !== day)
        : [...alertDays, day];
      return { ...prev, alert_days: newAlertDays };
    });
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSave(formData);
  }, [formData, onSave]);

  const currentTime = formData.date ? format(new Date(formData.date), "HH:mm") : "09:00";
  const isFutureDate = isFuture(new Date(formData.date));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
          placeholder="Ex: Reunião para entrega de documentos"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Data *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateTimeChange}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Horário *</Label>
          <Input
            id="time"
            type="time"
            value={currentTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Local</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          placeholder="Ex: Escritório, Tribunal, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Notas sobre o compromisso"
          rows={3}
        />
      </div>

      {isFutureDate && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Checkbox
              id="alerts_enabled"
              checked={formData.alerts_enabled}
              onCheckedChange={(checked) => handleChange("alerts_enabled", checked)}
            />
            <Label htmlFor="alerts_enabled" className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Ativar alertas para este compromisso
            </Label>
          </div>
          
          {formData.alerts_enabled && (
            <div className="space-y-2 pl-6">
              <p className="text-xs text-slate-600 mb-2">Notificar nos seguintes períodos:</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alert_7"
                    checked={(formData.alert_days || []).includes(7)}
                    onCheckedChange={() => handleAlertDayToggle(7)}
                  />
                  <Label htmlFor="alert_7" className="text-sm cursor-pointer">7 dias antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alert_3"
                    checked={(formData.alert_days || []).includes(3)}
                    onCheckedChange={() => handleAlertDayToggle(3)}
                  />
                  <Label htmlFor="alert_3" className="text-sm cursor-pointer">3 dias antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alert_1"
                    checked={(formData.alert_days || []).includes(1)}
                    onCheckedChange={() => handleAlertDayToggle(1)}
                  />
                  <Label htmlFor="alert_1" className="text-sm cursor-pointer">1 dia antes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="alert_0"
                    checked={(formData.alert_days || []).includes(0)}
                    onCheckedChange={() => handleAlertDayToggle(0)}
                  />
                  <Label htmlFor="alert_0" className="text-sm cursor-pointer">No dia do evento</Label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving} className="bg-[#1e3a5f] hover:bg-[#2d5a87]">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}