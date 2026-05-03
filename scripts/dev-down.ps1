Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $repoRoot 'logs\dev-processes.json'

Set-Location $repoRoot

if (Test-Path $pidFile) {
  $processInfo = Get-Content $pidFile | ConvertFrom-Json

  foreach ($name in 'apiPid', 'webPid') {
    $pidValue = $processInfo.$name
    if (-not $pidValue) {
      continue
    }

    $existing = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($existing) {
      Stop-Process -Id $pidValue -Force
    }
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

docker compose stop db

Write-Host 'Local dev services stopped.'
