param(
  [string]$Endpoint = 'http://127.0.0.1:9223/json',
  [string]$PageUrl = 'http://127.0.0.1:4173/',
  [string]$ArtifactDirectory = 'artifacts/design-qa/taptile'
)

$ErrorActionPreference = 'Stop'
$solverTarget = Invoke-RestMethod -Uri $Endpoint -TimeoutSec 5 |
  Where-Object { $_.type -eq 'page' -and $_.url -eq $PageUrl } |
  Select-Object -First 1
if (-not $solverTarget) { throw "No CDP page target found for $PageUrl" }

$solverSocket = [System.Net.WebSockets.ClientWebSocket]::new()
$solverSocket.ConnectAsync([Uri]$solverTarget.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$script:solverMessageId = 0

function Invoke-SolverCdpCommand {
  param([Parameter(Mandatory)][string]$Method, [hashtable]$Params = @{})
  $script:solverMessageId += 1
  $solverId = $script:solverMessageId
  $solverPayload = @{ id = $solverId; method = $Method; params = $Params } | ConvertTo-Json -Depth 12 -Compress
  $solverBytes = [Text.Encoding]::UTF8.GetBytes($solverPayload)
  $solverSocket.SendAsync([ArraySegment[byte]]::new($solverBytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
  while ($true) {
    $solverStream = [IO.MemoryStream]::new()
    do {
      $solverBuffer = New-Object byte[] 65536
      $solverReceive = $solverSocket.ReceiveAsync([ArraySegment[byte]]::new($solverBuffer), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      if ($solverReceive.Count -gt 0) { $solverStream.Write($solverBuffer, 0, $solverReceive.Count) }
    } until ($solverReceive.EndOfMessage)
    $solverJson = [Text.Encoding]::UTF8.GetString($solverStream.ToArray()) | ConvertFrom-Json
    $solverStream.Dispose()
    if ($solverJson.id -eq $solverId) {
      if ($solverJson.error) { throw ($solverJson.error | ConvertTo-Json -Compress) }
      return $solverJson.result
    }
  }
}

function Invoke-SolverExpression {
  param([Parameter(Mandatory)][string]$Expression)
  $solverResult = Invoke-SolverCdpCommand -Method 'Runtime.evaluate' -Params @{
    expression = $Expression
    returnByValue = $true
    awaitPromise = $true
  }
  return $solverResult.result.value
}

function Wait-SolverExpression {
  param([Parameter(Mandatory)][string]$Expression, [int]$Attempts = 100)
  for ($solverAttempt = 0; $solverAttempt -lt $Attempts; $solverAttempt += 1) {
    if (Invoke-SolverExpression -Expression $Expression) { return }
    Start-Sleep -Milliseconds 100
  }
  throw "Timed out waiting for: $Expression"
}

Invoke-SolverCdpCommand -Method 'Runtime.enable' | Out-Null
Invoke-SolverCdpCommand -Method 'Page.enable' | Out-Null
Invoke-SolverCdpCommand -Method 'Emulation.setDeviceMetricsOverride' -Params @{
  width = 1440; height = 1000; deviceScaleFactor = 1; mobile = $false
} | Out-Null
Invoke-SolverExpression -Expression "localStorage.removeItem('taptile-director-project/autosave/v2'); true" | Out-Null
Invoke-SolverCdpCommand -Method 'Page.reload' | Out-Null
Wait-SolverExpression -Expression "Boolean(document.querySelector('.tpt-studio'))"
Invoke-SolverExpression -Expression @'
(() => {
  window.__tptSolverErrors = [];
  window.addEventListener('error', (event) => window.__tptSolverErrors.push(String(event.error?.stack || event.message)));
  window.addEventListener('unhandledrejection', (event) => window.__tptSolverErrors.push(String(event.reason?.stack || event.reason)));
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    window.__tptSolverErrors.push(args.map((value) => String(value)).join(' '));
    originalError(...args);
  };
  document.querySelector('[data-mode-id="play"]').click();
  return true;
})()
'@ | Out-Null
Wait-SolverExpression -Expression "Boolean(document.querySelector('.tpt-session-bar[data-mode=play]'))"
Invoke-SolverExpression -Expression @'
(() => {
  const select = document.querySelector('[data-agent-profile]');
  select.value = 'safe-win';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('[data-action="generate-agent-take"]').click();
  return true;
})()
'@ | Out-Null
Wait-SolverExpression -Expression "Boolean(document.querySelector('.tpt-session-bar[data-mode=replay][data-valid=true]'))" -Attempts 160
Start-Sleep -Milliseconds 500

$solverSummary = Invoke-SolverExpression -Expression @'
(() => {
  const project = JSON.parse(localStorage.getItem('taptile-director-project/autosave/v2'));
  const take = project.takes.find((candidate) => candidate.id === project.selectedTakeId);
  return JSON.stringify({
    name: take?.name,
    result: take?.result,
    actions: take?.actions.length,
    allAgent: take?.actions.every((action) => action.actor === 'agent'),
    finalStateHash: take?.finalStateHash,
    replayValid: document.querySelector('.tpt-session-bar[data-mode=replay]')?.dataset.valid === 'true',
    consoleErrors: window.__tptSolverErrors.length,
  });
})()
'@ | ConvertFrom-Json
if ($solverSummary.result -ne 'won' -or -not $solverSummary.allAgent -or -not $solverSummary.replayValid) {
  throw "Agent Take did not pass browser verification: $($solverSummary | ConvertTo-Json -Compress)"
}
if ($solverSummary.consoleErrors -gt 0) { throw "Browser console errors: $($solverSummary.consoleErrors)" }

$solverArtifactRoot = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path $ArtifactDirectory))
[IO.Directory]::CreateDirectory($solverArtifactRoot) | Out-Null
$solverCapture = Invoke-SolverCdpCommand -Method 'Page.captureScreenshot' -Params @{ format = 'png'; captureBeyondViewport = $false }
[IO.File]::WriteAllBytes((Join-Path $solverArtifactRoot 'm5-agent-safe-win-replay.png'), [Convert]::FromBase64String([string]$solverCapture.data))
$solverSummary | ConvertTo-Json -Depth 5

Invoke-SolverCdpCommand -Method 'Emulation.clearDeviceMetricsOverride' | Out-Null
$solverSocket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$solverSocket.Dispose()
