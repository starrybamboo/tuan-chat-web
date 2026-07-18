Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# This repo keeps only project-specific config and Expo entrypoints here. The
# machine-local Android dev plumbing is shared with Watch-Maid.
$sharedAndroidScriptPath = Join-Path $env:USERPROFILE ".codex\scripts\android-mobile-dev-common.ps1"
if (-not (Test-Path $sharedAndroidScriptPath)) {
    throw "Shared Android dev script not found: $sharedAndroidScriptPath"
}
. $sharedAndroidScriptPath

function Get-TuanChatMobileAndroidConfig {
    $workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $workspaceContainerRoot = Split-Path $workspaceRoot -Parent

    return [PSCustomObject]@{
        WorkspaceRoot                       = $workspaceRoot
        WorkspaceContainerRoot              = $workspaceContainerRoot
        MobileDir                           = Join-Path $workspaceRoot "apps/mobile"
        AndroidDir                          = Join-Path $workspaceRoot "apps/mobile/android"
        JavaHome                            = "D:\.jdks\jbr-17.0.9"
        BuildAndroidSdkRoot                 = "D:\AndroidSdk"
        EmulatorAndroidSdkRoot              = "D:\android-sdk"
        AdbSdkRoot                          = "D:\android-sdk"
        GradleUserHome                      = Join-Path $workspaceContainerRoot ".gradle-home2"
        TempRoot                            = Join-Path $workspaceContainerRoot ".tmp\expo-temp"
        DefaultAvdName                      = "WatchMaid_API_36_Fresh"
        MetroPort                           = 8082
        ApiPort                             = 8081
        WebSocketPort                       = 8090
        AppPackage                          = "com.tuanchat.mobile"
        MainActivity                        = "com.tuanchat.mobile/.MainActivity"
        ProjectDisplayName                  = "TuanChat Mobile"
        SkipLocalPropertiesWhenAndroidDirMissing = $true
        RequiredPaths                       = @(
            $workspaceRoot
            (Join-Path $workspaceRoot "apps/mobile")
            "D:\.jdks\jbr-17.0.9"
            "D:\AndroidSdk"
            "D:\android-sdk"
        )
        AdditionalEmulatorArgs              = @(
            "-crash-report-mode", "never"
        )
        TcpStatusHosts                      = @("localhost", "[::1]", "127.0.0.1")
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
    $reversePorts = @($MetroPort, $Config.ApiPort, $Config.WebSocketPort) | Select-Object -Unique

    foreach ($reversePort in $reversePorts) {
        & $adbPath -s $DeviceSerial reverse "tcp:$reversePort" "tcp:$reversePort" | Out-Null
        Write-Host "adb reverse tcp:$reversePort tcp:$reversePort -> $DeviceSerial"
    }
}

function Invoke-TuanChatExpoRunAndroid {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$AvdName,
        [int]$Port = $Config.MetroPort
    )

    Set-AndroidDevBuildEnvironment -Config $Config

    Push-Location $Config.WorkspaceRoot
    try {
        $expoArgs = @(
            "--filter", "@tuanchat/mobile",
            "exec", "expo", "run:android",
            "-d", $AvdName,
            "--port", "$Port",
            "--no-build-cache"
        )

        & pnpm @expoArgs
        return $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}
