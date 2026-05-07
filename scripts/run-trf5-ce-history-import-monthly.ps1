param(
  [int]$InitialWindowDays = 7,
  [int]$InitialMaxPagesPerTerm = 1,
  [int]$MaxPagesPerTermCeiling = 4,
  [int]$DelaySeconds = 45,
  [int]$RetryDelaySeconds = 90,
  [int]$MaxRetriesPerBatch = 3,
  [switch]$DryRun,
  [switch]$StopOnFailure
)

$ErrorActionPreference = "Stop"

$Orchestrator = Join-Path $PSScriptRoot "run-trf5-ce-history-import.ps1"

$Periods = @(
  [pscustomobject]@{ Label = "outubro/2025"; Start = "2025-10-01"; End = "2025-10-31" },
  [pscustomobject]@{ Label = "novembro/2025"; Start = "2025-11-01"; End = "2025-11-30" },
  [pscustomobject]@{ Label = "dezembro/2025"; Start = "2025-12-01"; End = "2025-12-31" },
  [pscustomobject]@{ Label = "janeiro/2026"; Start = "2026-01-01"; End = "2026-01-31" },
  [pscustomobject]@{ Label = "fevereiro/2026"; Start = "2026-02-01"; End = "2026-02-28" },
  [pscustomobject]@{ Label = "marco/2026"; Start = "2026-03-01"; End = "2026-03-31" },
  [pscustomobject]@{ Label = "abril/2026"; Start = "2026-04-01"; End = "2026-04-30" },
  [pscustomobject]@{ Label = "maio/2026"; Start = "2026-05-01"; End = "2026-05-07" }
)

if (!(Test-Path -LiteralPath $Orchestrator)) {
  throw "Orquestrador nao encontrado em $Orchestrator"
}

$failures = @()

foreach ($period in $Periods) {
  Write-Host ("Processando TRF5/CE {0}: {1} a {2}" -f $period.Label, $period.Start, $period.End)

  $args = @(
    "-ExecutionPolicy", "Bypass",
    "-File", $Orchestrator,
    "-StartDate", $period.Start,
    "-EndDate", $period.End,
    "-InitialWindowDays", ([string]$InitialWindowDays),
    "-InitialMaxPagesPerTerm", ([string]$InitialMaxPagesPerTerm),
    "-MaxPagesPerTermCeiling", ([string]$MaxPagesPerTermCeiling),
    "-DelaySeconds", ([string]$DelaySeconds),
    "-RetryDelaySeconds", ([string]$RetryDelaySeconds),
    "-MaxRetriesPerBatch", ([string]$MaxRetriesPerBatch)
  )

  if ($DryRun) {
    $args += "-DryRun"
  }

  & powershell @args
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    $failure = [pscustomobject]@{
      label = $period.Label
      startDate = $period.Start
      endDate = $period.End
      exitCode = $exitCode
    }
    $failures += $failure

    Write-Warning ("Falha em {0} ({1} a {2}), exitCode={3}" -f $period.Label, $period.Start, $period.End, $exitCode)

    if ($StopOnFailure) {
      Write-Warning "StopOnFailure ativo; interrompendo sequencia mensal."
      exit $exitCode
    }
  }
}

if ($failures.Count -gt 0) {
  Write-Warning ("Sequencia mensal finalizada com {0} periodo(s) com falha." -f $failures.Count)
  $failures | Format-Table label, startDate, endDate, exitCode -AutoSize
  exit 1
}

Write-Host "Sequencia mensal finalizada sem falhas."
