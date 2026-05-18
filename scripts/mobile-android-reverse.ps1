param(
    [string]$DeviceSerial,
    [int]$Port
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "mobile-android-common.ps1")

$config = Get-TuanChatMobileAndroidConfig
if ($Port -le 0) {
    $Port = $config.MetroPort
}

Set-AndroidDevBuildEnvironment -Config $config

$onlineDevices = @(Get-AndroidDevAdbDevices -Config $config | Where-Object { $_.State -eq "device" })
if (-not [string]::IsNullOrWhiteSpace($DeviceSerial)) {
    $onlineDevices = @($onlineDevices | Where-Object { $_.Serial -eq $DeviceSerial })
}

if ($onlineDevices.Count -eq 0) {
    throw "No online Android device found for adb reverse."
}

foreach ($device in $onlineDevices) {
    Invoke-TuanChatAndroidReversePorts -Config $config -DeviceSerial $device.Serial -MetroPort $Port
}
