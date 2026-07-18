param(
  [string]$DeviceSerial,
  [switch]$ReversePorts
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..\..")
$adb = "D:\android-sdk\platform-tools\adb.exe"
if (-not (Test-Path -LiteralPath $adb)) {
  $adb = "D:\AndroidSdk\platform-tools\adb.exe"
}

$adbTargetArgs = @()
if (-not [string]::IsNullOrWhiteSpace($DeviceSerial)) {
  $adbTargetArgs = @("-s", $DeviceSerial.Trim())
}

function Invoke-AdbReversePort {
  param([Parameter(Mandatory = $true)][int]$Port)

  & $adb @adbTargetArgs reverse "tcp:$Port" "tcp:$Port" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "adb reverse tcp:$Port tcp:$Port 失败。"
  }
}
if (-not (Test-Path -LiteralPath $adb)) {
  throw "找不到 adb，请确认 Android SDK 已安装到 D:\AndroidSdk 或 D:\android-sdk。"
}

Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -match "(@tuanchat/mobile|expo start --port 8082|expo\\bin\\cli.*8082)") {
      Stop-Process -Id $process.ProcessId -Force
    }
  }

Invoke-AdbReversePort -Port 8082

if ($ReversePorts) {
  Invoke-AdbReversePort -Port 8081
  Invoke-AdbReversePort -Port 8090
  $env:EXPO_PUBLIC_TUANCHAT_API_BASE_URL = "http://127.0.0.1:8081"
  $env:EXPO_PUBLIC_TUANCHAT_API_WS_URL = "ws://127.0.0.1:8090"
}
else {
  $env:EXPO_PUBLIC_TUANCHAT_API_BASE_URL = "http://10.0.2.2:8081"
  $env:EXPO_PUBLIC_TUANCHAT_API_WS_URL = "ws://10.0.2.2:8090"
}
$env:EXPO_PUBLIC_CHAT_TIMING_TRACE = "1"
$env:EXPO_PUBLIC_MOBILE_NOTIFICATION_TRACE = "1"
$env:ANDROID_HOME = "D:\AndroidSdk"
$env:ANDROID_SDK_ROOT = "D:\AndroidSdk"
$env:PATH = "D:\AndroidSdk\platform-tools;D:\AndroidSdk\emulator;D:\AndroidSdk\cmdline-tools\latest\bin;$env:PATH"

Set-Location -LiteralPath $repoRoot
pnpm --filter @tuanchat/mobile start -- --clear
