param(
    [string]$AvdName,
    [int]$Port,
    [int]$EmulatorTimeoutSeconds = 240
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "mobile-android-common.ps1")

$config = Get-TuanChatMobileAndroidConfig
if ([string]::IsNullOrWhiteSpace($AvdName)) {
    $AvdName = $config.DefaultAvdName
}
if ($Port -le 0) {
    $Port = $config.MetroPort
}

$deviceSerial = Start-TuanChatAndroidEmulator -Config $config -AvdName $AvdName -TimeoutSeconds $EmulatorTimeoutSeconds
$topActivity = Get-TuanChatTopActivity -Config $config -DeviceSerial $deviceSerial

Write-Host "Android dev build is starting:"
Write-Host "  AVD: $AvdName"
Write-Host "  Device: $deviceSerial"
Write-Host "  Metro: http://localhost:$Port"
Write-Host "  Package: $($config.AppPackage)"
if ($topActivity) {
    Write-Host "  CurrentActivity: $topActivity"
}

$exitCode = Invoke-TuanChatExpoRunAndroid -Config $config -AvdName $AvdName -Port $Port
if ($exitCode -ne 0) {
    exit $exitCode
}

$appInstalled = Test-TuanChatAppInstalled -Config $config -DeviceSerial $deviceSerial
$topActivity = Get-TuanChatTopActivity -Config $config -DeviceSerial $deviceSerial

Write-Host "Android dev build finished."
Write-Host "  AppInstalled: $appInstalled"
if ($topActivity) {
    Write-Host "  TopActivity: $topActivity"
}
