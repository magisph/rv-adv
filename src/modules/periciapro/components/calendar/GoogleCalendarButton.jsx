import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GoogleCalendarButton({
  title,
  date,
  time,
  details,
  location,
  className,
}) {
  if (!date) return null;

  const handleAddToCalendar = () => {
    // Data base
    const startDate = new Date(`${date}T${time || "00:00:00"}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Duração padrão de 1h

    // Formatação para string YYYYMMDDTHHMMSS (local, sem time zone conversion complexa, assumindo input local)
    const formatLocal = (d) => {
      const pad = (n) => (n < 10 ? "0" + n : n);
      return (
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        "T" +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        "00"
      );
    };

    const startStr = formatLocal(startDate);
    const endStr = formatLocal(endDate);

    const baseUrl = "https://calendar.google.com/calendar/render";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Perícia: ${title}`,
      dates: `${startStr}/${endStr}`,
      details: details || "Perícia agendada via PeríciasPro.",
      location: location || "",
    });

    window.open(`${baseUrl}?${params.toString()}`, "_blank");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${className}`}
            onClick={handleAddToCalendar}
          >
            <CalendarPlus className="w-4 h-4 text-blue-600" />
            <span className="sr-only md:not-sr-only md:inline">
              Google Calendar
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Adicionar ao Google Calendar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
