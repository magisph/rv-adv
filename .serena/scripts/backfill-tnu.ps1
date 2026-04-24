$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdjYXJrbGl6aHd1b3Rrd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODMzMzksImV4cCI6MjA4NjY1OTMzOX0.pTVVbAQK76kso4H7I9vdmsh6WQhmau4tsmEyJYmYUx0"
    "Content-Type" = "application/json"
}

$ranges = @(
    @{ dataInicio = "2026-03-16"; dataFim = "2026-03-31" },
    @{ dataInicio = "2026-04-01"; dataFim = "2026-04-24" }
)

foreach ($range in $ranges) {
    $offset = 0
    if ($range.dataInicio -eq "2026-03-16") {
        $offset = 10 # Start from 10 since we already did 0 for the first payload
    }
    $hasMore = $true

    Write-Host "Iniciando backfill para: $($range.dataInicio) a $($range.dataFim)"

    while ($hasMore) {
        $body = @{
            "dataInicio" = $range.dataInicio
            "dataFim" = $range.dataFim
            "offset" = $offset
        } | ConvertTo-Json

        Write-Host "  -> Solicitando offset $offset..."
        
        try {
            $response = Invoke-RestMethod -Uri "https://uxtgcarklizhwuotkwkd.supabase.co/functions/v1/scrape-tnu" -Method POST -Headers $headers -Body $body
            
            Write-Host "     Total TNU: $($response.total_tnu) | Coletados: $($response.coletados) | Salvos: $($response.salvos)"
            
            $offset = $response.proximo_offset
            $hasMore = $response.proximo_disponivel
        } catch {
            Write-Host "     Erro ao solicitar offset $offset. Detalhes: $_"
            $hasMore = $false
        }
        
        # Delay 1s to avoid being blocked by anti-bot
        Start-Sleep -Seconds 1
    }
}
Write-Host "Backfill concluído!"
