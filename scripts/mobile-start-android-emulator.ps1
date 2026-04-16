param(
    [string]$AvdName,
    [int]$TimeoutSeconds = 240
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "mobile-android-common.ps1")

$config = Get-TuanChatMobileAndroidConfig
if ([string]::IsNullOrWhiteSpace($AvdName)) {
    $AvdName = $config.DefaultAvdName
}

$deviceSerial = Start-TuanChatAndroidEmulator -Config $config -AvdName $AvdName -TimeoutSeconds $TimeoutSeconds
Write-Host "Android emulator is ready: $AvdName -> $deviceSerial"
