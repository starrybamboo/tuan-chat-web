param(
  [string]$Source = "d:\A_programming\AFFiNE\blocksuite\playground",
  [string]$Destination = "d:\A_programming\tuan-chat-web\doc-test2",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Source)) {
  Write-Error "源目录不存在：$Source"
  exit 1
}

if (Test-Path $Destination) {
  if ($Force) {
    Remove-Item -Recurse -Force $Destination
  } else {
    Write-Error "目标目录已存在：$Destination"
    exit 1
  }
}

New-Item -ItemType Directory -Path $Destination | Out-Null

robocopy $Source $Destination /MIR /XD node_modules .git /NFL /NDL /NJH /NJS /NP
$rc = $LASTEXITCODE

if ($rc -ge 8) {
  exit $rc
}

exit 0
