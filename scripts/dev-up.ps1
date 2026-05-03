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

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Action,
    [Parameter(Mandatory = $true)][string]$ErrorMessage
  )

  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw $ErrorMessage
  }
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
      cmd.exe /d /c "taskkill /PID $pidValue /T /F 1>nul 2>nul"
      Start-Sleep -Milliseconds 500
    }
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

function Clear-LogFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  for ($attempt = 1; $attempt -le 20; $attempt++) {
    try {
      Set-Content -Path $Path -Value ''
      return
    } catch {
      Start-Sleep -Milliseconds 300
    }
  }

  throw "Log file is still locked: $Path"
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

Invoke-Step 'Checking Docker engine' {
  Invoke-Native { docker info | Out-Null } 'Docker engine is not running'
}

Invoke-Step 'Stopping previous local dev processes' {
  Stop-ExistingDevProcesses
}

Clear-LogFile -Path $apiLog
Clear-LogFile -Path $webLog

Invoke-Step 'Starting PostgreSQL container' {
  Invoke-Native { docker compose up -d db } 'Failed to start PostgreSQL container'
}

Invoke-Step 'Waiting for PostgreSQL readiness' {
  $maxAttempts = 30
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    cmd.exe /d /c "docker compose exec -T db pg_isready -U postgres -d bussinessv3 1>nul 2>nul"
    if ($LASTEXITCODE -eq 0) {
      return
    }

    Start-Sleep -Seconds 2
  }

  throw 'PostgreSQL did not become ready in time'
}

Invoke-Step 'Generating Prisma client' {
  npm.cmd --prefix apps/api run prisma:generate
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
