$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$localDbRoot = Join-Path $repoRoot '.local-postgres'
$dataDir = Join-Path $localDbRoot 'data'
$logFile = Join-Path $localDbRoot 'server.log'

if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION'))) {
  throw 'The local development database is not initialized.'
}

$pgBin = @(
  $env:PG_BIN_DIR,
  'D:\PostgreSQL\bin',
  'C:\Program Files\PostgreSQL\18\bin'
) | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'pg_ctl.exe')) } | Select-Object -First 1

if (-not $pgBin) {
  throw 'PostgreSQL 18 bin directory not found. Set PG_BIN_DIR.'
}

& (Join-Path $pgBin 'pg_isready.exe') -h 127.0.0.1 -p 5433 | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Output 'Local development database is running at 127.0.0.1:5433'
  exit 0
}

& (Join-Path $pgBin 'pg_ctl.exe') start -D $dataDir -l $logFile -o '-h 127.0.0.1 -p 5433' -w
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to start the local development database.'
}

Write-Output 'Local development database started at 127.0.0.1:5433'
