param(
    [string]$DeviceSerial,
    [string]$AvdName,
    [string]$Architectures = "x86_64",
    [switch]$AllArchitectures,
    [switch]$ReversePorts,
    [int]$EmulatorTimeoutSeconds = 240
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "mobile-android-common.ps1")

$config = Get-TuanChatMobileAndroidConfig
if ([string]::IsNullOrWhiteSpace($AvdName)) {
    $AvdName = $config.DefaultAvdName
}

$variantName = "Debug"
$deviceSerial = if ([string]::IsNullOrWhiteSpace($DeviceSerial)) { "" } else { $DeviceSerial.Trim() }

if (-not [string]::IsNullOrWhiteSpace($deviceSerial)) {
    Set-AndroidDevBuildEnvironment -Config $config
    $matchedDevice = Get-AndroidDevAdbDevices -Config $config |
        Where-Object { $_.Serial -eq $deviceSerial -and $_.State -eq "device" } |
        Select-Object -First 1
    if ($null -eq $matchedDevice) {
        throw "Android device is not online: $deviceSerial"
    }

    if (-not $AllArchitectures -and -not $PSBoundParameters.ContainsKey("Architectures")) {
        $adbPath = Get-AndroidDevAdbPath -Config $config
        $deviceAbi = (& $adbPath -s $deviceSerial shell getprop ro.product.cpu.abi).Trim()
        if ([string]::IsNullOrWhiteSpace($deviceAbi)) {
            throw "Could not detect Android device ABI: $deviceSerial"
        }
        $Architectures = $deviceAbi
    }
}

$apkScript = Join-Path $PSScriptRoot "mobile-android-apk.ps1"
if (-not (Test-Path $apkScript)) {
    throw "Android package script not found: $apkScript"
}

$apkArgs = @{
    Variant         = $variantName
    UseLocalBackend = $true
}
if ($ReversePorts) {
    $apkArgs.ApiBaseUrl = "http://127.0.0.1:$($config.ApiPort)"
    $apkArgs.WebSocketUrl = "ws://127.0.0.1:$($config.WebSocketPort)"
}

if ($AllArchitectures) {
    $apkArgs.AllArchitectures = $true
}
else {
    $architecturesName = $Architectures.Trim()
    if ([string]::IsNullOrWhiteSpace($architecturesName)) {
        throw "Architectures must not be empty."
    }
    $apkArgs.Architectures = $architecturesName
}

Write-Host "Building a debug APK for the local backend workflow..."
& $apkScript @apkArgs
if (-not $?) {
    exit 1
}

$variantOutputName = $variantName.ToLowerInvariant()
$apkOutputDir = Join-Path $config.AndroidDir "app\build\outputs\apk\$variantOutputName"
if (-not (Test-Path $apkOutputDir)) {
    throw "APK output directory was not found: $apkOutputDir"
}

$apkFile = Get-ChildItem -LiteralPath $apkOutputDir -Filter "*.apk" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if ($null -eq $apkFile) {
    throw "No APK file was found in: $apkOutputDir"
}

Set-AndroidDevBuildEnvironment -Config $config

if ([string]::IsNullOrWhiteSpace($deviceSerial)) {
    $deviceSerial = Start-AndroidDevEmulator -Config $config -AvdName $AvdName -TimeoutSeconds $EmulatorTimeoutSeconds
}

$adbPath = Get-AndroidDevAdbPath -Config $config
if ($ReversePorts) {
    Invoke-TuanChatAndroidReversePorts -Config $config -DeviceSerial $deviceSerial -MetroPort $config.MetroPort
}

Write-Host "Installing APK on Android device..."
Write-Host "  Device: $deviceSerial"
Write-Host "  APK: $($apkFile.FullName)"
& $adbPath -s $deviceSerial install -r $apkFile.FullName | Out-Host
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $adbPath -s $deviceSerial shell am start -n $config.MainActivity | Out-Null
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

$topActivity = Get-AndroidDevTopActivity -Config $config -DeviceSerial $deviceSerial

Write-Host "Android APK is installed and launched."
Write-Host "  Device: $deviceSerial"
Write-Host "  Package: $($config.AppPackage)"
if ($topActivity) {
    Write-Host "  TopActivity: $topActivity"
}
