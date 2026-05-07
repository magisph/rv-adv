param(
  [string]$StartDate = "2025-10-01",
  [string]$EndDate = "2026-05-07",
  [int]$InitialWindowDays = 7,
  [int]$InitialMaxPagesPerTerm = 1,
  [int]$MaxPagesPerTermCeiling = 4,
  [int]$DelaySeconds = 45,
  [int]$RetryDelaySeconds = 90,
  [int]$MaxRetriesPerBatch = 3,
  [switch]$DryRun,
  [switch]$Resume
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BaseReportDir = Join-Path $Root "reports\trf5-ce-history-import"
$Importer = Join-Path $Root "scripts\import-trf5-ce-history.mjs"
$SummaryHeader = "timestamp,startDate,endDate,term,orgao,maxPages,success,found,normalized,inserted,updated,ignored,errors,portalRequests,truncated,exitCode,reportDir"
$FailuresHeader = "timestamp,startDate,endDate,term,orgao,maxPages,reason,exitCode,reportDir"

$Terms = @(
  "LOAS",
  "BPC",
  "beneficio assistencial",
  "aposentadoria",
  "aposentadoria por idade",
  "aposentadoria por idade rural",
  "aposentadoria por idade urbana",
  "segurado especial",
  "trabalhador rural",
  "aposentadoria rural",
  "beneficio por incapacidade",
  "auxilio-doenca",
  "aposentadoria por invalidez",
  "incapacidade temporaria",
  "incapacidade permanente",
  "auxilio por incapacidade temporaria",
  "aposentadoria por incapacidade permanente",
  "pensao por morte",
  "salario-maternidade",
  "previdenciario",
  "beneficio"
)

$Presidencias = @(
  "PRESIDÊNCIA DA 1ª TURMA RECURSAL DO CEARÁ",
  "PRESIDÊNCIA DA 2ª TURMA RECURSAL DO CEARÁ",
  "PRESIDÊNCIA DA 3ª TURMA RECURSAL DO CEARÁ"
)

$Relatorias = @(
  "1ª RELATORIA DA 1ª TURMA RECURSAL DO CEARÁ",
  "2ª RELATORIA DA 1ª TURMA RECURSAL DO CEARÁ",
  "3ª RELATORIA DA 1ª TURMA RECURSAL DO CEARÁ",
  "1ª RELATORIA DA 2ª TURMA RECURSAL DO CEARÁ",
  "2ª RELATORIA DA 2ª TURMA RECURSAL DO CEARÁ",
  "3ª RELATORIA DA 2ª TURMA RECURSAL DO CEARÁ",
  "1ª RELATORIA DA 3ª TURMA RECURSAL DO CEARÁ",
  "2ª RELATORIA DA 3ª TURMA RECURSAL DO CEARÁ",
  "3ª RELATORIA DA 3ª TURMA RECURSAL DO CEARÁ"
)

function ConvertTo-IsoDate([datetime]$Date) {
  return $Date.ToString("yyyy-MM-dd")
}

function ConvertFrom-IsoDate([string]$Date) {
  return [datetime]::ParseExact($Date, "yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
}

function Get-WindowDays($Batch) {
  $start = ConvertFrom-IsoDate $Batch.startDate
  $end = ConvertFrom-IsoDate $Batch.endDate
  return [int](($end - $start).TotalDays + 1)
}

function New-RunId {
  return (Get-Date).ToString("yyyyMMdd-HHmmss")
}

function New-Batch($Stage, $Start, $End, $Term, $Orgao, $MaxPages, $Source) {
  $script:NextBatchNumber += 1
  return [pscustomobject][ordered]@{
    id = ("batch-{0:D6}" -f $script:NextBatchNumber)
    stage = $Stage
    startDate = $Start
    endDate = $End
    term = $Term
    orgao = $Orgao
    maxPages = $MaxPages
    attempt = 0
    source = $Source
  }
}

function New-DateWindows([string]$Start, [string]$End, [int]$WindowDays) {
  $windows = @()
  $cursor = ConvertFrom-IsoDate $Start
  $limit = ConvertFrom-IsoDate $End

  while ($cursor -le $limit) {
    $windowEnd = $cursor.AddDays($WindowDays - 1)
    if ($windowEnd -gt $limit) { $windowEnd = $limit }
    $windows += [pscustomobject][ordered]@{
      startDate = ConvertTo-IsoDate $cursor
      endDate = ConvertTo-IsoDate $windowEnd
    }
    $cursor = $windowEnd.AddDays(1)
  }

  return $windows
}

function New-InitialQueue {
  $queue = @()
  $windows = New-DateWindows $StartDate $EndDate $InitialWindowDays

  foreach ($orgao in $Presidencias) {
    foreach ($term in $Terms) {
      foreach ($window in $windows) {
        $queue += New-Batch 1 $window.startDate $window.endDate $term $orgao $InitialMaxPagesPerTerm "initial"
      }
    }
  }

  foreach ($orgao in $Relatorias) {
    foreach ($term in $Terms) {
      foreach ($window in $windows) {
        $queue += New-Batch 2 $window.startDate $window.endDate $term $orgao $InitialMaxPagesPerTerm "initial"
      }
    }
  }

  return $queue
}

function Split-Batch($Batch, [int]$MaxPages, [string]$Reason) {
  $start = ConvertFrom-IsoDate $Batch.startDate
  $end = ConvertFrom-IsoDate $Batch.endDate
  $days = Get-WindowDays $Batch
  if ($days -le 1) { return @() }

  $leftEnd = $start.AddDays([math]::Floor(($days - 1) / 2))
  $rightStart = $leftEnd.AddDays(1)

  return @(
    (New-Batch $Batch.stage (ConvertTo-IsoDate $start) (ConvertTo-IsoDate $leftEnd) $Batch.term $Batch.orgao $MaxPages $Reason),
    (New-Batch $Batch.stage (ConvertTo-IsoDate $rightStart) (ConvertTo-IsoDate $end) $Batch.term $Batch.orgao $MaxPages $Reason)
  )
}

function Save-State {
  param($State)
  $State.lastUpdated = (Get-Date).ToUniversalTime().ToString("o")
  $State.nextBatchNumber = $script:NextBatchNumber
  $json = $State | ConvertTo-Json -Depth 30
  Set-Content -LiteralPath (Join-Path $State.runDir "state.json") -Value $json -Encoding UTF8
}

function Add-CsvRow([string]$Path, $Row) {
  $object = [pscustomobject]$Row
  $line = ($object | ConvertTo-Csv -NoTypeInformation)[1]
  Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

function Initialize-CsvFiles([string]$RunDir) {
  Set-Content -LiteralPath (Join-Path $RunDir "summary.csv") -Value $SummaryHeader -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $RunDir "failures.csv") -Value $FailuresHeader -Encoding UTF8
}

function Get-ReportPath($Batch, [string]$ReportDir) {
  return Join-Path $ReportDir ("trf5-ce-{0}_{1}.json" -f $Batch.startDate, $Batch.endDate)
}

function Invoke-ImporterBatch($Batch, [string]$ReportDir, [string]$LogPath) {
  New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
  $args = @(
    $Importer,
    "--start-date", $Batch.startDate,
    "--end-date", $Batch.endDate,
    "--chunk", "single",
    "--max-pages-per-term", ([string]$Batch.maxPages),
    "--terms", $Batch.term,
    "--orgaos-julgadores", $Batch.orgao,
    "--report-dir", $ReportDir
  )

  $output = & node @args 2>&1
  $exitCode = $LASTEXITCODE
  $output | Set-Content -LiteralPath $LogPath -Encoding UTF8

  return [ordered]@{
    exitCode = $exitCode
    output = ($output -join "`n")
  }
}

function Read-BatchReport($Batch, [string]$ReportDir) {
  $path = Get-ReportPath $Batch $ReportDir
  if (!(Test-Path -LiteralPath $path)) { return $null }
  try {
    return Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-RetryAfterMs([string]$Text) {
  $matches = [regex]::Matches($Text, "Retry after\s+(\d+)ms", "IgnoreCase")
  $max = 0
  foreach ($match in $matches) {
    $value = [int]$match.Groups[1].Value
    if ($value -gt $max) { $max = $value }
  }
  return $max
}

function Test-RateLimit($Report, [string]$LogText) {
  $samples = ""
  if ($Report -and $Report.errorSamples) {
    $samples = ($Report.errorSamples -join "`n")
  }
  $text = "$samples`n$LogText"
  return ($text -match "Rate limit exceeded" -or $text -match "Retry after")
}

function Test-WorkerLimit([string]$LogText) {
  return ($LogText -match "HTTP 546" -or $LogText -match "WORKER_LIMIT")
}

function Write-Summary($State, $Batch, $Report, [int]$ExitCode, [string]$ReportDir) {
  Add-CsvRow (Join-Path $State.runDir "summary.csv") ([ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    startDate = $Batch.startDate
    endDate = $Batch.endDate
    term = $Batch.term
    orgao = $Batch.orgao
    maxPages = $Batch.maxPages
    success = [bool]$Report.success
    found = [int]$Report.found
    normalized = [int]$Report.normalized
    inserted = [int]$Report.inserted
    updated = [int]$Report.updated
    ignored = [int]$Report.ignored
    errors = [int]$Report.errors
    portalRequests = [int]$Report.portalRequests
    truncated = [bool]$Report.truncated
    exitCode = $ExitCode
    reportDir = $ReportDir
  })
}

function Write-Failure($State, $Batch, [string]$Reason, [int]$ExitCode, [string]$ReportDir) {
  Add-CsvRow (Join-Path $State.runDir "failures.csv") ([ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    startDate = $Batch.startDate
    endDate = $Batch.endDate
    term = $Batch.term
    orgao = $Batch.orgao
    maxPages = $Batch.maxPages
    reason = $Reason
    exitCode = $ExitCode
    reportDir = $ReportDir
  })
}

function Add-Completed($State, $Batch, $ReportDir) {
  $State.completedBatches += [ordered]@{
    id = $Batch.id
    stage = $Batch.stage
    startDate = $Batch.startDate
    endDate = $Batch.endDate
    term = $Batch.term
    orgao = $Batch.orgao
    maxPages = $Batch.maxPages
    completedAt = (Get-Date).ToUniversalTime().ToString("o")
    reportDir = $ReportDir
  }
}

function Add-Failed($State, $Batch, [string]$Reason, [int]$ExitCode, [string]$ReportDir) {
  $State.failedBatches += [ordered]@{
    id = $Batch.id
    stage = $Batch.stage
    startDate = $Batch.startDate
    endDate = $Batch.endDate
    term = $Batch.term
    orgao = $Batch.orgao
    maxPages = $Batch.maxPages
    attempt = $Batch.attempt
    reason = $Reason
    exitCode = $ExitCode
    reportDir = $ReportDir
    failedAt = (Get-Date).ToUniversalTime().ToString("o")
    reprocessed = ($Batch.stage -eq 3)
  }
  Write-Failure $State $Batch $Reason $ExitCode $ReportDir
}

function Add-PendingFront($State, $Batches) {
  if (!$Batches -or $Batches.Count -eq 0) { return }
  $State.pendingBatches = @($Batches) + @($State.pendingBatches)
}

function Add-PendingFrontSingle($State, $Batch) {
  $State.pendingBatches = @($Batch) + @($State.pendingBatches)
}

function Wait-Conservative([int]$Seconds, [string]$Reason) {
  if ($Seconds -le 0) { return }
  Write-Host ("Aguardando {0}s ({1})..." -f $Seconds, $Reason)
  Start-Sleep -Seconds $Seconds
}

function Start-SanityCheck($State) {
  $batch = [ordered]@{
    id = "sanity-check"
    stage = 0
    startDate = "2025-11-24"
    endDate = "2025-11-25"
    term = "LOAS"
    orgao = "PRESIDÊNCIA DA 1ª TURMA RECURSAL DO CEARÁ"
    maxPages = 1
    attempt = 0
    source = "sanity"
  }
  $reportDir = Join-Path $State.runDir "sanity-check"
  $logPath = Join-Path $reportDir "console.log"

  Write-Host "Executando sanity check TRF5/CE antes da importacao completa..."
  $result = Invoke-ImporterBatch $batch $reportDir $logPath
  $report = Read-BatchReport $batch $reportDir

  if (!$report) {
    throw "Sanity check falhou: relatorio JSON ausente ou invalido. Veja $logPath"
  }
  if ($result.exitCode -ne 0) {
    throw "Sanity check falhou: importador retornou exitCode $($result.exitCode). Veja $logPath"
  }
  if ([int]$report.found -le 0) {
    throw "Sanity check falhou: found <= 0. Veja $reportDir"
  }
  if ([int]$report.errors -gt 0 -or [bool]$report.truncated) {
    throw "Sanity check falhou: errors=$($report.errors), truncated=$($report.truncated). Veja $reportDir"
  }

  $State.sanityCheck = [ordered]@{
    passed = $true
    checkedAt = (Get-Date).ToUniversalTime().ToString("o")
    reportDir = $reportDir
    found = [int]$report.found
    normalized = [int]$report.normalized
    inserted = [int]$report.inserted
    updated = [int]$report.updated
  }
  Save-State $State
}

function Start-FailureReprocess($State) {
  $candidates = @($State.failedBatches | Where-Object { -not $_.reprocessed })
  if ($candidates.Count -eq 0) {
    $State.phase = "done"
    Save-State $State
    return
  }

  Write-Host ("Iniciando reprocessamento conservador de {0} falhas..." -f $candidates.Count)
  $newBatches = @()
  foreach ($failed in $candidates) {
    $windows = New-DateWindows $failed.startDate $failed.endDate 1
    foreach ($window in $windows) {
      $newBatches += New-Batch 3 $window.startDate $window.endDate $failed.term $failed.orgao 1 "failure_reprocess"
    }
    $failed.reprocessed = $true
  }
  $State.phase = "failure_reprocess"
  $State.pendingBatches = @($newBatches)
  Save-State $State
}

function Invoke-Decision($State, $Batch, [int]$ExitCode, $Report, [string]$LogText, [string]$ReportDir) {
  if ($Report) {
    Write-Summary $State $Batch $Report $ExitCode $ReportDir
  }

  $hasValidReport = $null -ne $Report
  $isWorkerLimit = Test-WorkerLimit $LogText
  $isRateLimit = Test-RateLimit $Report $LogText
  $days = Get-WindowDays $Batch
  $effectiveDelay = if ($Batch.stage -eq 3) { [math]::Max($DelaySeconds, 90) } else { $DelaySeconds }
  $effectiveRetryDelay = if ($Batch.stage -eq 3) { [math]::Max($RetryDelaySeconds, 180) } else { $RetryDelaySeconds }

  if ($hasValidReport -and [int]$Report.errors -eq 0 -and -not [bool]$Report.truncated) {
    Add-Completed $State $Batch $ReportDir
    Save-State $State
    Wait-Conservative $effectiveDelay "lote concluido"
    return
  }

  if ($hasValidReport -and [int]$Report.errors -eq 0 -and [bool]$Report.truncated) {
    if ($days -gt 1) {
      Add-PendingFront $State (Split-Batch $Batch 1 "truncated_split")
      Save-State $State
      Wait-Conservative $effectiveDelay "truncamento; janela dividida"
      return
    }

    if ([int]$Batch.maxPages -lt $MaxPagesPerTermCeiling) {
      $retry = New-Batch $Batch.stage $Batch.startDate $Batch.endDate $Batch.term $Batch.orgao ([int]$Batch.maxPages + 1) "truncated_more_pages"
      $retry.attempt = [int]$Batch.attempt + 1
      Add-PendingFrontSingle $State $retry
      Save-State $State
      Wait-Conservative $effectiveDelay "truncamento em 1 dia; maxPages aumentado"
      return
    }

    Add-Failed $State $Batch "truncated_at_max_pages" $ExitCode $ReportDir
    Save-State $State
    Wait-Conservative $effectiveDelay "truncamento no teto de paginas"
    return
  }

  if (($hasValidReport -and ([int]$Report.errors -gt 0 -or $isRateLimit)) -or (!$hasValidReport -and ($ExitCode -ne 0 -or $isWorkerLimit))) {
    $retryAfterMs = Get-RetryAfterMs $LogText
    if ($hasValidReport -and $Report.errorSamples) {
      $retryAfterMs = [math]::Max($retryAfterMs, (Get-RetryAfterMs ($Report.errorSamples -join "`n")))
    }

    if ($days -gt 1) {
      Add-PendingFront $State (Split-Batch $Batch 1 "error_split")
      Save-State $State
      if ($retryAfterMs -gt 0) {
        Wait-Conservative ([math]::Ceiling(($retryAfterMs + 15000) / 1000)) "rate limit informado"
      } else {
        Wait-Conservative $effectiveRetryDelay "erro recuperavel; janela dividida"
      }
      return
    }

    if ([int]$Batch.attempt -lt $MaxRetriesPerBatch) {
      $retry = New-Batch $Batch.stage $Batch.startDate $Batch.endDate $Batch.term $Batch.orgao 1 "retry"
      $retry.attempt = [int]$Batch.attempt + 1
      Add-PendingFrontSingle $State $retry
      Save-State $State
      if ($retryAfterMs -gt 0) {
        Wait-Conservative ([math]::Ceiling(($retryAfterMs + 15000) / 1000)) "rate limit informado"
      } else {
        Wait-Conservative $effectiveRetryDelay "retry de lote diario"
      }
      return
    }

    $reason = if ($isWorkerLimit) { "worker_limit_or_http_546" } elseif ($isRateLimit) { "rate_limit_retry_exhausted" } elseif ($hasValidReport) { "errors_retry_exhausted" } else { "missing_report_retry_exhausted" }
    Add-Failed $State $Batch $reason $ExitCode $ReportDir
    Save-State $State
    Wait-Conservative $effectiveRetryDelay "falha registrada"
    return
  }

  Add-Failed $State $Batch "unhandled_failure" $ExitCode $ReportDir
  Save-State $State
  Wait-Conservative $effectiveRetryDelay "falha nao classificada"
}

function Start-ImportLoop($State) {
  while ($true) {
    if (@($State.pendingBatches).Count -eq 0) {
      if ($State.phase -ne "failure_reprocess" -and $State.phase -ne "done") {
        Start-FailureReprocess $State
        continue
      }

      $State.phase = "done"
      Save-State $State
      Write-Host "Importacao finalizada. Consulte summary.csv, failures.csv e state.json."
      break
    }

    $batch = $State.pendingBatches[0]
    $State.pendingBatches = @($State.pendingBatches | Select-Object -Skip 1)
    Save-State $State

    $reportDir = Join-Path $State.runDir ("reports\{0}" -f $batch.id)
    $logPath = Join-Path $State.runDir ("logs\{0}.log" -f $batch.id)
    New-Item -ItemType Directory -Force -Path (Split-Path $logPath -Parent) | Out-Null

    Write-Host ("Executando {0}: {1} a {2} | term='{3}' | orgao='{4}' | maxPages={5}" -f $batch.id, $batch.startDate, $batch.endDate, $batch.term, $batch.orgao, $batch.maxPages)
    $result = Invoke-ImporterBatch $batch $reportDir $logPath
    $report = Read-BatchReport $batch $reportDir
    Invoke-Decision $State $batch $result.exitCode $report $result.output $reportDir
  }
}

if (!(Test-Path -LiteralPath $Importer)) {
  throw "Importador nao encontrado em $Importer"
}

$script:NextBatchNumber = 0

if ($DryRun) {
  $queue = New-InitialQueue
  Write-Host ("Dry-run: {0} lotes iniciais gerados." -f $queue.Count)
  Write-Host "Amostra dos primeiros lotes:"
  $queue | Select-Object -First 10 | Format-Table id, stage, startDate, endDate, term, orgao, maxPages -AutoSize
  Write-Host "Nenhuma chamada node/Supabase foi executada."
  exit 0
}

if ($Resume) {
  if (!(Test-Path -LiteralPath $BaseReportDir)) {
    throw "Nao ha pasta de execucao anterior em $BaseReportDir"
  }

  $latest = Get-ChildItem -LiteralPath $BaseReportDir -Directory |
    Sort-Object LastWriteTime -Descending |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "state.json") } |
    Select-Object -First 1

  if (!$latest) {
    throw "Nenhuma execucao anterior com state.json valido foi encontrada em $BaseReportDir"
  }

  $State = Get-Content -Raw -LiteralPath (Join-Path $latest.FullName "state.json") | ConvertFrom-Json
  if ($null -ne $State.nextBatchNumber) {
    $script:NextBatchNumber = [int]$State.nextBatchNumber
  } else {
    $script:NextBatchNumber = 0
  }
  Write-Host ("Retomando execucao em {0}" -f $State.runDir)
  Start-ImportLoop $State
  exit 0
}

$runId = New-RunId
$runDir = Join-Path $BaseReportDir $runId
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runDir "reports") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runDir "logs") | Out-Null
Initialize-CsvFiles $runDir

$State = [ordered]@{
  runId = $runId
  runDir = $runDir
  phase = "initial"
  parameters = [ordered]@{
    startDate = $StartDate
    endDate = $EndDate
    initialWindowDays = $InitialWindowDays
    initialMaxPagesPerTerm = $InitialMaxPagesPerTerm
    maxPagesPerTermCeiling = $MaxPagesPerTermCeiling
    delaySeconds = $DelaySeconds
    retryDelaySeconds = $RetryDelaySeconds
    maxRetriesPerBatch = $MaxRetriesPerBatch
  }
  pendingBatches = @(New-InitialQueue)
  completedBatches = @()
  failedBatches = @()
  sanityCheck = [ordered]@{ passed = $false }
  nextBatchNumber = $script:NextBatchNumber
  lastUpdated = (Get-Date).ToUniversalTime().ToString("o")
}

Save-State $State
Start-SanityCheck $State
Start-ImportLoop $State
