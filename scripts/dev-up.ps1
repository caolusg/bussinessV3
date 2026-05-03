Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $repoRoot 'logs'
$pidFile = Join-Path $logsDir 'dev-processes.json'
$apiLog = Join-Path $logsDir 'api-dev.log'
$webLog = Join-Path $logsDir 'web-dev.log'

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host "==> $Label"
  & $Action
}

function Test-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Stop-ExistingDevProcesses {
  if (-not (Test-Path $pidFile)) {
    return
  }

  try {
    $processInfo = Get-Content $pidFile | ConvertFrom-Json
  } catch {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    return
  }

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

if (-not (Test-Command 'npm.cmd')) {
  throw 'npm.cmd is required'
}

if (-not (Test-Command 'docker')) {
  throw 'docker is required'
}

Set-Location $repoRoot

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host 'Created .env from .env.example'
}

if (-not (Test-Path $logsDir)) {
  New-Item -ItemType Directory -Path $logsDir | Out-Null
}

Set-Content -Path $apiLog -Value ''
Set-Content -Path $webLog -Value ''

Invoke-Step 'Checking Docker engine' {
  docker version --format '{{.Server.Version}}' | Out-Null
}

Invoke-Step 'Stopping previous local dev processes' {
  Stop-ExistingDevProcesses
}

Invoke-Step 'Starting PostgreSQL container' {
  docker compose up -d db
}

Invoke-Step 'Waiting for PostgreSQL readiness' {
  $maxAttempts = 30
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    docker compose exec -T db pg_isready -U postgres -d bussinessv3 *> $null
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 2
  }

  throw 'PostgreSQL did not become ready in time'
}

Invoke-Step 'Running database migrations' {
  npm.cmd run db:migrate
}

Invoke-Step 'Seeding base data' {
  npm.cmd run db:seed
}

Invoke-Step 'Starting API dev server in background' {
  $apiProcess = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', 'npm.cmd run api:dev >> logs\api-dev.log 2>&1' `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -PassThru

  $script:apiPid = $apiProcess.Id
}

Invoke-Step 'Starting web dev server in background' {
  $webProcess = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', 'npm.cmd run web:dev >> logs\web-dev.log 2>&1' `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -PassThru

  $script:webPid = $webProcess.Id
}

@{
  apiPid = $script:apiPid
  webPid = $script:webPid
} | ConvertTo-Json | Set-Content $pidFile

Write-Host ''
Write-Host 'Local dev services started.'
Write-Host 'Web: http://localhost:3000'
Write-Host 'API: http://localhost:8000/api/health'
Write-Host "Logs: $logsDir"
