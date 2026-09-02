param(
  [string]$Endpoint = 'http://127.0.0.1:9223/json',
  [string]$PageUrl = 'http://127.0.0.1:4173/',
  [string]$ArtifactDirectory = 'artifacts/design-qa/taptile'
)

$ErrorActionPreference = 'Stop'
$renderTarget = Invoke-RestMethod -Uri $Endpoint -TimeoutSec 5 |
  Where-Object { $_.type -eq 'page' -and $_.url -eq $PageUrl } |
  Select-Object -First 1
if (-not $renderTarget) { throw "No CDP page target found for $PageUrl" }
$renderSocket = [System.Net.WebSockets.ClientWebSocket]::new()
$renderSocket.ConnectAsync([Uri]$renderTarget.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$script:renderMessageId = 0

function Invoke-RenderCdpCommand {
  param([Parameter(Mandatory)][string]$Method, [hashtable]$Params = @{})
  $script:renderMessageId += 1
  $renderId = $script:renderMessageId
  $renderPayload = @{ id = $renderId; method = $Method; params = $Params } | ConvertTo-Json -Depth 12 -Compress
  $renderBytes = [Text.Encoding]::UTF8.GetBytes($renderPayload)
  $renderSocket.SendAsync([ArraySegment[byte]]::new($renderBytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
  while ($true) {
    $renderStream = [IO.MemoryStream]::new()
    do {
      $renderBuffer = New-Object byte[] 1048576
      $renderReceive = $renderSocket.ReceiveAsync([ArraySegment[byte]]::new($renderBuffer), [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      if ($renderReceive.Count -gt 0) { $renderStream.Write($renderBuffer, 0, $renderReceive.Count) }
    } until ($renderReceive.EndOfMessage)
    $renderJson = [Text.Encoding]::UTF8.GetString($renderStream.ToArray()) | ConvertFrom-Json
    $renderStream.Dispose()
    if ($renderJson.id -eq $renderId) {
      if ($renderJson.error) { throw ($renderJson.error | ConvertTo-Json -Compress) }
      return $renderJson.result
    }
  }
}

function Invoke-RenderExpression {
  param([Parameter(Mandatory)][string]$Expression)
  $renderResult = Invoke-RenderCdpCommand -Method 'Runtime.evaluate' -Params @{
    expression = $Expression; returnByValue = $true; awaitPromise = $true
  }
  return $renderResult.result.value
}

function Wait-RenderExpression {
  param([Parameter(Mandatory)][string]$Expression, [int]$Attempts = 200)
  for ($renderAttempt = 0; $renderAttempt -lt $Attempts; $renderAttempt += 1) {
    if (Invoke-RenderExpression -Expression $Expression) { return }
    Start-Sleep -Milliseconds 100
  }
  throw "Timed out waiting for: $Expression"
}

function Set-ExportPreviewFrame {
  param([Parameter(Mandatory)][int]$Frame)
  $renderSetFrame = (@'
(() => {
  const input = document.querySelector('[data-export-preview-seek]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, '__FRAME__');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()
'@).Replace('__FRAME__', [string]$Frame)
  Invoke-RenderExpression -Expression $renderSetFrame | Out-Null
  Wait-RenderExpression -Expression "document.querySelector('.tpt-canvas-preview')?.dataset.previewRenderedFrame === '$Frame' && document.querySelector('.tpt-canvas-preview')?.dataset.previewPixelHash !== 'pending'"
}

function Save-CanvasPng {
  param([Parameter(Mandatory)][string]$Path)
  $renderDataUrl = [string](Invoke-RenderExpression -Expression "document.querySelector('.tpt-canvas-preview').toDataURL('image/png')")
  $renderBase64 = $renderDataUrl.Substring($renderDataUrl.IndexOf(',') + 1)
  [IO.File]::WriteAllBytes($Path, [Convert]::FromBase64String($renderBase64))
}

Invoke-RenderCdpCommand -Method 'Runtime.enable' | Out-Null
Invoke-RenderCdpCommand -Method 'Page.enable' | Out-Null
Invoke-RenderCdpCommand -Method 'Emulation.setDeviceMetricsOverride' -Params @{ width = 1440; height = 1000; deviceScaleFactor = 1; mobile = $false } | Out-Null
Invoke-RenderExpression -Expression "localStorage.removeItem('taptile-director-project/autosave/v2'); true" | Out-Null
Invoke-RenderCdpCommand -Method 'Page.reload' | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('.tpt-studio'))"
Invoke-RenderExpression -Expression @'
(() => {
  window.__tptRenderErrors = [];
  window.addEventListener('error', (event) => window.__tptRenderErrors.push(String(event.error?.stack || event.message)));
  window.addEventListener('unhandledrejection', (event) => window.__tptRenderErrors.push(String(event.reason?.stack || event.reason)));
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    window.__tptRenderErrors.push(args.map((value) => String(value)).join(' '));
    originalError(...args);
  };
  document.querySelector('[data-mode-id="validate"]').click();
  return true;
})()
'@ | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('.tpt-blocker-graph line'))"

$renderPair = Invoke-RenderExpression -Expression @'
(() => {
  const edge = document.querySelector('.tpt-blocker-graph line');
  return JSON.stringify({ blockerId: edge.dataset.blockerId, blockedId: edge.dataset.blockedId });
})()
'@ | ConvertFrom-Json
$renderSelectPair = (@'
(() => {
  document.querySelector('[data-tile-id="__BLOCKER__"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 801 }));
  document.querySelector('[data-tile-id="__BLOCKED__"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 802, shiftKey: true }));
  return true;
})()
'@).Replace('__BLOCKER__', [string]$renderPair.blockerId).Replace('__BLOCKED__', [string]$renderPair.blockedId)
Invoke-RenderExpression -Expression $renderSelectPair | Out-Null
Invoke-RenderExpression -Expression "document.querySelector('.tpt-override-actions button').click(); true" | Out-Null
Invoke-RenderExpression -Expression "document.querySelector('.tpt-validation-play').click(); true" | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('.tpt-session-bar[data-mode=play]'))"

$renderSequence = @('hourglass-43', 'hourglass-44', 'hourglass-45', 'hourglass-46', 'hourglass-47', 'hourglass-48')
foreach ($renderTileId in $renderSequence) {
  $renderTap = (@'
(() => {
  document.querySelector('[data-tile-id="__TILE_ID__"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 810 }));
  return true;
})()
'@).Replace('__TILE_ID__', $renderTileId)
  Invoke-RenderExpression -Expression $renderTap | Out-Null
  Start-Sleep -Milliseconds 40
}
Invoke-RenderExpression -Expression "document.querySelector('.tpt-session-bar[data-mode=play] .tpt-action-primary').click(); true" | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('.tpt-session-bar[data-mode=replay][data-valid=true]'))"
Invoke-RenderExpression -Expression "document.querySelector('[data-mode-id=direct]').click(); true" | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('select[data-director-profile]'))"
Invoke-RenderExpression -Expression @'
(() => {
  const select = document.querySelector('select[data-director-profile]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, 'combo-rush');
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()
'@ | Out-Null
Wait-RenderExpression -Expression "document.querySelector('.tpt-director-timeline')?.dataset.profileId === 'combo-rush'"
Invoke-RenderExpression -Expression "document.querySelector('[data-mode-id=export]').click(); true" | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('.tpt-export-panel'))"
Wait-RenderExpression -Expression "document.querySelector('.tpt-canvas-preview')?.dataset.previewRenderedFrame === '0' && document.querySelector('.tpt-canvas-preview')?.dataset.previewPixelHash !== 'pending'"

$renderArtifactRoot = [IO.Path]::GetFullPath((Join-Path (Get-Location).Path $ArtifactDirectory))
[IO.Directory]::CreateDirectory($renderArtifactRoot) | Out-Null
$renderCheckpoints = Invoke-RenderExpression -Expression "document.querySelector('.tpt-export-panel').dataset.regressionFrames" | ConvertFrom-Json
$renderHashes = [ordered]@{}
foreach ($renderCheckpoint in $renderCheckpoints) {
  $renderFrame = [int]$renderCheckpoint.frameNumber
  Set-ExportPreviewFrame -Frame $renderFrame
  $renderHashA = [string](Invoke-RenderExpression -Expression "document.querySelector('.tpt-canvas-preview').dataset.previewPixelHash")
  $renderOtherFrame = if ($renderFrame -lt ($renderCheckpoints[-1].frameNumber)) { $renderFrame + 1 } else { [Math]::Max(0, $renderFrame - 1) }
  Set-ExportPreviewFrame -Frame $renderOtherFrame
  Set-ExportPreviewFrame -Frame $renderFrame
  $renderHashB = [string](Invoke-RenderExpression -Expression "document.querySelector('.tpt-canvas-preview').dataset.previewPixelHash")
  if ($renderHashA -ne $renderHashB) { throw "Canvas pixel drift at $($renderCheckpoint.label): $renderHashA -> $renderHashB" }
  $renderHashes[$renderCheckpoint.label] = $renderHashA
  Save-CanvasPng -Path (Join-Path $renderArtifactRoot "m8-$($renderCheckpoint.label)-frame-$renderFrame.png")
}

$renderTakeCountBefore = [int](Invoke-RenderExpression -Expression "JSON.parse(localStorage.getItem('taptile-director-project/autosave/v2')).takes.length")
Invoke-RenderExpression -Expression "document.querySelector('[data-action=start-taptile-export]').click(); true" | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('[data-action=cancel-taptile-export]'))"
Invoke-RenderExpression -Expression "document.querySelector('[data-action=cancel-taptile-export]').click(); true" | Out-Null
Wait-RenderExpression -Expression "Boolean(document.querySelector('.tpt-export-error')) && Boolean(document.querySelector('[data-action=start-taptile-export]'))"
$renderTakeCountAfterCancel = [int](Invoke-RenderExpression -Expression "JSON.parse(localStorage.getItem('taptile-director-project/autosave/v2')).takes.length")
if ($renderTakeCountAfterCancel -ne $renderTakeCountBefore) { throw 'Canceling export changed the project Takes.' }

Invoke-RenderExpression -Expression "document.querySelector('[data-action=start-taptile-export]').click(); true" | Out-Null
Wait-RenderExpression -Expression "document.querySelector('.tpt-export-panel')?.dataset.exportPhase === 'done' && Number(document.querySelector('.tpt-export-panel').dataset.exportBytes) > 1000" -Attempts 1200
$renderExport = Invoke-RenderExpression -Expression @'
(async () => {
  const panel = document.querySelector('.tpt-export-panel');
  const link = document.querySelector('[data-export-download]');
  const blob = await fetch(link.href).then((response) => response.blob());
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return JSON.stringify({
    frames: Number(panel.dataset.exportFrames),
    bytes: Number(panel.dataset.exportBytes),
    duration: Number(panel.dataset.exportDuration),
    type: blob.type,
    fileName: link.download,
    base64: btoa(binary),
  });
})()
'@ | ConvertFrom-Json
$renderMp4Path = Join-Path $renderArtifactRoot 'm8-six-action-combo-rush-1080x1920.mp4'
[IO.File]::WriteAllBytes($renderMp4Path, [Convert]::FromBase64String([string]$renderExport.base64))
$renderErrors = Invoke-RenderExpression -Expression "JSON.stringify(window.__tptRenderErrors || [])" | ConvertFrom-Json
if ($renderExport.type -ne 'video/mp4') { throw "Unexpected export MIME: $($renderExport.type)" }
if (@($renderErrors).Count -gt 0) { throw "Browser errors: $($renderErrors | ConvertTo-Json -Compress)" }

[ordered]@{
  dimensions = '1080x1920'
  fps = 30
  frames = $renderExport.frames
  durationSeconds = $renderExport.duration
  bytes = $renderExport.bytes
  mime = $renderExport.type
  canceledWithoutMutation = ($renderTakeCountBefore -eq $renderTakeCountAfterCancel)
  checkpointHashes = $renderHashes
  consoleErrors = @($renderErrors).Count
  mp4 = $renderMp4Path
  artifactDirectory = $renderArtifactRoot
} | ConvertTo-Json -Depth 8

Invoke-RenderCdpCommand -Method 'Emulation.clearDeviceMetricsOverride' | Out-Null
$renderSocket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
$renderSocket.Dispose()
