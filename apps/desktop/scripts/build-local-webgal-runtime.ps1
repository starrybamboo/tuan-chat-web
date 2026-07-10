[CmdletBinding()]
param(
  [string]$RuntimeOutputDirName = "tuanchat-runtime"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopRoot = Split-Path -Parent $scriptDir
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $desktopRoot)
$collectionRoot = Split-Path -Parent $workspaceRoot
$webgalRoot = Join-Path $collectionRoot "WebGAL"
$terreRoot = Join-Path $collectionRoot "WebGAL_Terre"
$terreReleaseScript = Join-Path $terreRoot "release-windows.ps1"

function Test-TruthyEnv {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $false
  }

  $normalized = $Value.Trim().ToLowerInvariant()
  return $normalized -in @('1', 'true', 'yes', 'on')
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string[]]$Arguments = @()
  )

  Write-Host ('[electron:webgal] {0}> {1} {2}' -f $WorkingDirectory, $Command, ($Arguments -join ' '))
  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw ('Command failed with exit code {0}: {1} {2}' -f $LASTEXITCODE, $Command, ($Arguments -join ' '))
    }
  }
  finally {
    Pop-Location
  }
}

if (-not [string]::IsNullOrWhiteSpace($env:WEBGAL_TERRE_RELEASE_DIR)) {
  Write-Host ('[electron:webgal] WEBGAL_TERRE_RELEASE_DIR is set, skip local WebGAL/WebGAL_Terre build: {0}' -f $env:WEBGAL_TERRE_RELEASE_DIR)
  exit 0
}

if (Test-TruthyEnv -Value ([string]$env:TUANCHAT_SKIP_LOCAL_WEBGAL_BUILD)) {
  Write-Host '[electron:webgal] TUANCHAT_SKIP_LOCAL_WEBGAL_BUILD is enabled, skip local WebGAL/WebGAL_Terre build.'
  exit 0
}

if (-not (Test-Path -LiteralPath $webgalRoot)) {
  throw ('Missing local WebGAL repository: {0}' -f $webgalRoot)
}

if (-not (Test-Path -LiteralPath $terreReleaseScript)) {
  throw ('Missing WebGAL_Terre release script: {0}' -f $terreReleaseScript)
}

Invoke-External -WorkingDirectory $webgalRoot -Command 'yarn' -Arguments @('install', '--frozen-lockfile', '--network-timeout=300000')
Invoke-External -WorkingDirectory $webgalRoot -Command 'yarn' -Arguments @('build')
Invoke-External -WorkingDirectory $terreRoot -Command 'powershell' -Arguments @(
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  '.\release-windows.ps1',
  '-OutputDirName',
  $RuntimeOutputDirName
)
