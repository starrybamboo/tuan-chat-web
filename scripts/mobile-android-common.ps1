Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sharedAndroidScriptPath = Join-Path $env:USERPROFILE ".codex\scripts\android-mobile-dev-common.ps1"
if (-not (Test-Path $sharedAndroidScriptPath)) {
    throw "Shared Android dev script not found: $sharedAndroidScriptPath"
}
. $sharedAndroidScriptPath

function Get-TuanChatMobileAndroidConfig {
    $workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $workspaceContainerRoot = Split-Path $workspaceRoot -Parent
    $buildAndroidSdkRoot = "D:\AndroidSdk"

    return [PSCustomObject]@{
        WorkspaceRoot                         = $workspaceRoot
        WorkspaceContainerRoot                = $workspaceContainerRoot
        MobileDir                             = Join-Path $workspaceRoot "apps/mobile"
        AndroidDir                            = Join-Path $workspaceRoot "apps/mobile/android"
        JavaHome                              = "D:\.jdks\jbr-17.0.9"
        BuildAndroidSdkRoot                   = $buildAndroidSdkRoot
        EmulatorAndroidSdkRoot                = "D:\AndroidSdk"
        AdbSdkRoot                            = "D:\AndroidSdk"
        GradleUserHome                        = Join-Path $workspaceContainerRoot ".gradle-home2"
        TempRoot                              = Join-Path $workspaceContainerRoot ".tmp\expo-temp"
        DefaultAvdName                        = "WatchMaid_API_36_Fresh"
        MetroPort                             = 8082
        ApiPort                               = 8081
        AppPackage                            = "com.tuanchat.mobile"
        MainActivity                          = "com.tuanchat.mobile/.MainActivity"
        ProjectDisplayName                    = "TuanChat Mobile"
        IncludeAppPackageInTopActivityPattern = $true
        RequiredPaths                         = @(
            $workspaceRoot
            (Join-Path $workspaceRoot "apps/mobile")
            "D:\.jdks\jbr-17.0.9"
            $buildAndroidSdkRoot
            "D:\AndroidSdk"
        )
        AdditionalEmulatorArgs                = @(
            "-crash-report-mode", "never"
        )
    }
}

function Start-TuanChatExpoWindow {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [int]$Port = $Config.MetroPort,
        [switch]$Android
    )

    if (Test-AndroidDevTcpPortReady -Port $Port -Config $Config) {
        return
    }

    $scriptPath = Join-Path $PSScriptRoot "mobile-start-expo.ps1"
    $argumentList = @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", $scriptPath,
        "-Port", "$Port"
    )

    if ($Android) {
        $argumentList += "-Android"
    }

    Start-Process -FilePath "powershell.exe" -ArgumentList $argumentList -WorkingDirectory $Config.WorkspaceRoot | Out-Null
}

function Invoke-TuanChatAndroidReversePorts {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$DeviceSerial,
        [int]$MetroPort = $Config.MetroPort
    )

    $adbPath = Get-AndroidDevAdbPath -Config $Config
    $reversePorts = @($MetroPort, $Config.ApiPort) | Select-Object -Unique

    foreach ($reversePort in $reversePorts) {
        & $adbPath -s $DeviceSerial reverse "tcp:$reversePort" "tcp:$reversePort" | Out-Null
        Write-Host "adb reverse tcp:$reversePort tcp:$reversePort -> $DeviceSerial"
    }
}

function Invoke-TuanChatExpoRunAndroid {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$DeviceSerial,
        [int]$Port = $Config.MetroPort
    )

    Set-AndroidDevBuildEnvironment -Config $Config

    $adbPath = Get-AndroidDevAdbPath -Config $Config
    $deviceAbi = (& $adbPath -s $DeviceSerial shell getprop ro.product.cpu.abi).Trim()
    $reactNativeArchitectures = switch -Wildcard ($deviceAbi) {
        "arm64-v8a" { "arm64-v8a"; break }
        "armeabi-v7a" { "armeabi-v7a"; break }
        "x86_64" { "x86_64"; break }
        "x86" { "x86"; break }
        default { "arm64-v8a"; break }
    }

    $gradleWrapper = Join-Path $Config.AndroidDir "gradlew.bat"
    if (-not (Test-Path $gradleWrapper)) {
        throw "gradlew.bat not found: $gradleWrapper"
    }

    Push-Location $Config.AndroidDir
    try {
        & $gradleWrapper "app:assembleDebug" "-x" "lint" "-PreactNativeDevServerPort=$Port" "-PreactNativeArchitectures=$reactNativeArchitectures" "--console=plain" | Out-Host
        $gradleExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($gradleExitCode -ne 0) {
        return $gradleExitCode
    }

    $apkPath = Join-Path $Config.AndroidDir "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path $apkPath)) {
        throw "Debug APK was not generated: $apkPath"
    }

    Invoke-TuanChatAndroidReversePorts -Config $Config -DeviceSerial $DeviceSerial -MetroPort $Port
    & $adbPath -s $DeviceSerial install -r $apkPath | Out-Host
    if ($LASTEXITCODE -ne 0) {
        return $LASTEXITCODE
    }

    & $adbPath -s $DeviceSerial shell am start -n $Config.MainActivity | Out-Null
    return $LASTEXITCODE
}
