param(
    [string]$DeviceSerial,
    [string]$AvdName,
    [int]$Port,
    [int]$EmulatorTimeoutSeconds = 240,
    [switch]$UseEmulator
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

$onlineDevices = @(Get-AndroidDevAdbDevices -Config $config | Where-Object { $_.State -eq "device" })
$physicalDevices = @($onlineDevices | Where-Object { $_.Serial -notlike "emulator-*" })

if ([string]::IsNullOrWhiteSpace($DeviceSerial) -and -not $UseEmulator -and $physicalDevices.Count -eq 1) {
    $DeviceSerial = $physicalDevices[0].Serial
}

if ([string]::IsNullOrWhiteSpace($DeviceSerial)) {
    $DeviceSerial = Start-AndroidDevEmulator -Config $config -AvdName $AvdName -TimeoutSeconds $EmulatorTimeoutSeconds
}

$deviceSerial = $DeviceSerial
$topActivity = Get-AndroidDevTopActivity -Config $config -DeviceSerial $deviceSerial

Write-Host "Android dev build is starting:"
if ($deviceSerial -like "emulator-*") {
    Write-Host "  AVD: $AvdName"
}
Write-Host "  Device: $deviceSerial"
Write-Host "  Metro: http://localhost:$Port"
Write-Host "  Package: $($config.AppPackage)"
if ($topActivity) {
    Write-Host "  CurrentActivity: $topActivity"
}

$exitCode = Invoke-TuanChatExpoRunAndroid -Config $config -DeviceSerial $deviceSerial -Port $Port
if ($exitCode -ne 0) {
    exit $exitCode
}

$appInstalled = Test-AndroidDevPackageInstalled -Config $config -DeviceSerial $deviceSerial
$topActivity = Get-AndroidDevTopActivity -Config $config -DeviceSerial $deviceSerial

Write-Host "Android dev build finished."
Write-Host "  AppInstalled: $appInstalled"
if ($topActivity) {
    Write-Host "  TopActivity: $topActivity"
}
