$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dGdjYXJrbGl6aHd1b3Rrd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODMzMzksImV4cCI6MjA4NjY1OTMzOX0.pTVVbAQK76kso4H7I9vdmsh6WQhmau4tsmEyJYmYUx0"
    "Content-Type" = "application/json"
}

$ranges = @(
    @{ dataInicio = "2026-03-16"; dataFim = "2026-03-31"; startOffset = 120 },
    @{ dataInicio = "2026-04-01"; dataFim = "2026-04-24"; startOffset = 10 }
)

foreach ($range in $ranges) {
    $offset = $range.startOffset
    $hasMore = $true

    Write-Host "Iniciando backfill para: $($range.dataInicio) a $($range.dataFim) a partir do offset $offset"

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
        
        Start-Sleep -Seconds 2
    }
}
Write-Host "Backfill concluído!"
