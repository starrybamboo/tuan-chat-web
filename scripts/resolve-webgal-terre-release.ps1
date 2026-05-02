param(
  [string]$DownloadUrl = $env:WEBGAL_TERRE_RELEASE_URL,
  [string]$OutputDir = "ci-webgal-terre-release"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DownloadUrl)) {
  throw "Missing WebGAL_Terre release URL. Configure GitHub secret WEBGAL_TERRE_RELEASE_URL with a zip archive containing WebGAL_Terre.exe."
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path -Path $PSScriptRoot -ChildPath "..")).Path

function Resolve-ProjectChildPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ChildPath
  )

  [System.IO.Path]::GetFullPath((Join-Path -Path $projectRoot -ChildPath $ChildPath))
}

function Assert-ProjectChildPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $pathSeparators = [char[]]@(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  )
  $root = [System.IO.Path]::GetFullPath($projectRoot).TrimEnd($pathSeparators)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $prefix = "$root$([System.IO.Path]::DirectorySeparatorChar)"

  if ($fullPath.Equals($root, [System.StringComparison]::OrdinalIgnoreCase) -or
      -not $fullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label must be inside project root: $fullPath"
  }
}

$outputRoot = Resolve-ProjectChildPath $OutputDir
Assert-ProjectChildPath -Path $outputRoot -Label "OutputDir"
$archivePath = Join-Path -Path $projectRoot -ChildPath "webgal-terre-release.zip"

if (Test-Path $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

Write-Host "[webgal-terre] downloading runtime archive..."
Invoke-WebRequest -Uri $DownloadUrl -OutFile $archivePath

Write-Host "[webgal-terre] extracting runtime archive..."
Expand-Archive -LiteralPath $archivePath -DestinationPath $outputRoot -Force

$exe = Get-ChildItem -LiteralPath $outputRoot -Filter "WebGAL_Terre.exe" -Recurse -File |
  Sort-Object FullName |
  Select-Object -First 1

if ($null -eq $exe) {
  throw "Downloaded WebGAL_Terre release does not contain WebGAL_Terre.exe."
}

$releaseDir = $exe.Directory.FullName
Write-Host "[webgal-terre] resolved release dir: $releaseDir"

if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_ENV)) {
  "WEBGAL_TERRE_RELEASE_DIR=$releaseDir" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
}
