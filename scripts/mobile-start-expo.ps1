param(
    [int]$Port,
    [switch]$Android,
    [switch]$ReverseAndroid
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "mobile-android-common.ps1")

$config = Get-TuanChatMobileAndroidConfig
if ($Port -le 0) {
    $Port = $config.MetroPort
}

Set-AndroidDevBuildEnvironment -Config $config

if ($Android -or $ReverseAndroid) {
    $onlineDevices = @(Get-AndroidDevAdbDevices -Config $config | Where-Object { $_.State -eq "device" })
    if ($onlineDevices.Count -eq 0) {
        Write-Warning "No online Android device found for adb reverse."
    }
    foreach ($device in $onlineDevices) {
        Invoke-TuanChatAndroidReversePorts -Config $config -DeviceSerial $device.Serial -MetroPort $Port
    }
}

Push-Location $config.WorkspaceRoot
try {
    $expoArgs = @(
        "--filter", "@tuanchat/mobile",
        "exec", "expo", "start",
        "--port", "$Port",
        "--host", "lan"
    )

    if ($Android) {
        $expoArgs += @("--android", "--dev-client")
    }

    & pnpm @expoArgs
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
