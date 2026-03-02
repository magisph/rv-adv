import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { calendarService } from "@/modules/periciapro/services/calendarService";

export default function GoogleCalendarSync({ pericia, onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);

    try {
      const result = await calendarService.syncToGoogleCalendar(pericia.id);


      setSyncStatus(result);

      if (result.success && onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      setSyncStatus({
        success: false,
        error: error.message || "Erro ao sincronizar",
      });
    } finally {
      setSyncing(false);
    }
  };

  const isSynced = pericia.google_calendar_event_id;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSync}
          disabled={syncing || !pericia.data_pericia}
          variant={isSynced ? "outline" : "default"}
          size="sm"
          className="gap-2"
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          {syncing
            ? "Sincronizando..."
            : isSynced
              ? "Atualizar Calendar"
              : "Sincronizar com Calendar"}
        </Button>

        {isSynced && (
          <Badge
            variant="outline"
            className="gap-1 bg-green-50 text-green-700 border-green-300"
          >
            <CheckCircle className="w-3 h-3" />
            Sincronizado
          </Badge>
        )}
      </div>

      {syncStatus && (
        <Alert
          className={
            syncStatus.success
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }
        >
          {syncStatus.success ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription
            className={syncStatus.success ? "text-green-800" : "text-red-800"}
          >
            {syncStatus.success ? (
              <>
                Sincronizado com sucesso!{" "}
                {syncStatus.event_url && (
                  <a
                    href={syncStatus.event_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    Ver no Calendar
                  </a>
                )}
              </>
            ) : (
              <>Erro: {syncStatus.error}</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!pericia.data_pericia && (
        <Alert className="bg-blue-50 border-blue-300">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            Configure a data e horário da perícia para habilitar a
            sincronização.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
