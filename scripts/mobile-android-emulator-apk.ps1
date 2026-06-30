param(
    [string]$DeviceSerial,
    [string]$AvdName,
    [string]$Variant = "Release",
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

$variantName = $Variant.Trim()
if ([string]::IsNullOrWhiteSpace($variantName)) {
    throw "Variant must not be empty."
}

$releaseScript = Join-Path $PSScriptRoot "mobile-android-release.ps1"
if (-not (Test-Path $releaseScript)) {
    throw "Android package script not found: $releaseScript"
}

$releaseArgs = @{
    Variant = $variantName
}

if ($AllArchitectures) {
    $releaseArgs.AllArchitectures = $true
}
else {
    $architecturesName = $Architectures.Trim()
    if ([string]::IsNullOrWhiteSpace($architecturesName)) {
        throw "Architectures must not be empty."
    }
    $releaseArgs.Architectures = $architecturesName
}

Write-Host "Building APK with the existing local package flow and cache strategy..."
& $releaseScript @releaseArgs
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

if ([string]::IsNullOrWhiteSpace($DeviceSerial)) {
    $deviceSerial = Start-AndroidDevEmulator -Config $config -AvdName $AvdName -TimeoutSeconds $EmulatorTimeoutSeconds
}
else {
    $matchedDevice = Get-AndroidDevAdbDevices -Config $config |
        Where-Object { $_.Serial -eq $DeviceSerial -and $_.State -eq "device" } |
        Select-Object -First 1
    if ($null -eq $matchedDevice) {
        throw "Android device is not online: $DeviceSerial"
    }
    $deviceSerial = $DeviceSerial
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
