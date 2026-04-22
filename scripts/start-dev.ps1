# NurseHelper — arranque en desarrollo (Windows)
# Equivale a scripts/start-dev.sh pero con APIs de Windows.
# Uso:
#   Desde la raíz del repo: npm run dev:win
#   O:  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
#   O:  doble clic en scripts\start-dev.cmd

$ErrorActionPreference = 'Continue'

$RepoRoot = if ($PSScriptRoot) {
  (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} else {
  (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')).Path
}

Set-Location $RepoRoot

function Write-Info([string] $Message) {
  Write-Host $Message -ForegroundColor Blue
}
function Write-Ok([string] $Message) {
  Write-Host $Message -ForegroundColor Green
}
function Write-Warn([string] $Message) {
  Write-Host $Message -ForegroundColor Yellow
}
function Write-Err([string] $Message) {
  Write-Host $Message -ForegroundColor Red
}

Write-Host ''
Write-Host '🚀 Iniciando NurseHelper (Frontend + Backend) [Windows]' -ForegroundColor Cyan
Write-Host ''

function Get-ListeningPids([int] $Port) {
  try {
    return @(
      Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { $_.OwningProcess } |
        Sort-Object -Unique
    )
  } catch {
    return @()
  }
}

function Free-Port([int] $Port) {
  $pids = @(Get-ListeningPids $Port | Where-Object { $_ -and $_ -gt 0 })
  if ($pids.Count -eq 0) {
    Write-Ok "✅ Puerto $Port está libre"
    return $true
  }

  Write-Warn "⚠️  Puerto $Port está en uso. Liberando..."
  foreach ($procId in $pids) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    } catch {
      # ignorar PIDs ya cerrados o protegidos
    }
  }

  Start-Sleep -Seconds 1

  $still = @(Get-ListeningPids $Port | Where-Object { $_ -and $_ -gt 0 })
  if ($still.Count -gt 0) {
    Write-Err "❌ No se pudo liberar el puerto $Port"
    return $false
  }

  Write-Ok "✅ Puerto $Port liberado"
  return $true
}

Write-Info '🔍 Verificando puertos...'
if (-not (Free-Port 3000)) {
  exit 1
}
if (-not (Free-Port 4200)) {
  exit 1
}
Write-Host ''

Write-Info '🔍 Verificando dependencias...'
$backendModules = Join-Path $RepoRoot 'backend\node_modules'
$frontendModules = Join-Path $RepoRoot 'frontend\node_modules'

if (-not (Test-Path $backendModules)) {
  Write-Warn '⚠️  Instalando dependencias del backend...'
  Push-Location (Join-Path $RepoRoot 'backend')
  try {
    npm install
    if ($LASTEXITCODE -ne 0) {
      Write-Err '❌ npm install falló en backend'
      exit 1
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $frontendModules)) {
  Write-Warn '⚠️  Instalando dependencias del frontend...'
  Push-Location (Join-Path $RepoRoot 'frontend')
  try {
    npm install
    if ($LASTEXITCODE -ne 0) {
      Write-Err '❌ npm install falló en frontend'
      exit 1
    }
  } finally {
    Pop-Location
  }
}
Write-Host ''

Write-Info '🔄 Verificando migraciones pendientes...'
Push-Location (Join-Path $RepoRoot 'backend')
try {
  $migrationOutput = npm run migration:run 2>&1 | Out-String
  if ($migrationOutput -match 'No migrations') {
    Write-Ok '✅ No hay migraciones pendientes'
  } else {
    Write-Ok '✅ Migraciones ejecutadas'
  }
} catch {
  Write-Warn "⚠️  No se pudieron ejecutar migraciones: $($_.Exception.Message)"
} finally {
  Pop-Location
}
Write-Host ''

Write-Ok '🚀 Iniciando servicios...'
Write-Host ''

npm run dev
exit $LASTEXITCODE
