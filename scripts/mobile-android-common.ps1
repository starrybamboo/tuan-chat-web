Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-ToGradlePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    return $Path.Replace("\", "\\").Replace(":", "\:")
}

function Get-TuanChatMobileAndroidConfig {
    $workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    $workspaceContainerRoot = Split-Path $workspaceRoot -Parent

    return [PSCustomObject]@{
        WorkspaceRoot          = $workspaceRoot
        WorkspaceContainerRoot = $workspaceContainerRoot
        MobileDir              = Join-Path $workspaceRoot "apps/mobile"
        AndroidDir             = Join-Path $workspaceRoot "apps/mobile/android"
        JavaHome               = "D:\.jdks\jbr-17.0.9"
        BuildAndroidSdkRoot    = "D:\AndroidSdk"
        EmulatorAndroidSdkRoot = "D:\android-sdk"
        AdbSdkRoot             = "D:\android-sdk"
        GradleUserHome         = Join-Path $workspaceContainerRoot ".gradle-home2"
        TempRoot               = Join-Path $workspaceContainerRoot ".tmp\expo-temp"
        DefaultAvdName         = "WatchMaid_API_36_Fresh"
        MetroPort              = 8082
        AppPackage             = "com.tuanchat.mobile"
        MainActivity           = "com.tuanchat.mobile/.MainActivity"
        ProjectDisplayName     = "TuanChat Mobile"
    }
}

function Initialize-TuanChatMobileAndroidWorkspace {
    param([Parameter(Mandatory = $true)]$Config)

    $requiredPaths = @(
        $Config.WorkspaceRoot,
        $Config.MobileDir,
        $Config.JavaHome,
        $Config.BuildAndroidSdkRoot,
        $Config.EmulatorAndroidSdkRoot,
        $Config.AdbSdkRoot
    )

    foreach ($path in $requiredPaths) {
        if (-not (Test-Path $path)) {
            throw "Missing required path: $path"
        }
    }

    foreach ($path in @($Config.GradleUserHome, $Config.TempRoot)) {
        if (-not (Test-Path $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }
}

function Add-TuanChatPathEntry {
    param([Parameter(Mandatory = $true)][string]$PathEntry)

    if ([string]::IsNullOrWhiteSpace($env:Path)) {
        $env:Path = $PathEntry
        return
    }

    $entries = $env:Path -split ";"
    if ($entries -contains $PathEntry) {
        return
    }

    $env:Path = "$PathEntry;$env:Path"
}

function Set-TuanChatMobileAndroidEnvironment {
    param([Parameter(Mandatory = $true)]$Config)

    Initialize-TuanChatMobileAndroidWorkspace -Config $Config

    $env:JAVA_HOME = $Config.JavaHome
    $env:ANDROID_HOME = $Config.EmulatorAndroidSdkRoot
    $env:ANDROID_SDK_ROOT = $Config.EmulatorAndroidSdkRoot

    Add-TuanChatPathEntry -PathEntry (Join-Path $Config.JavaHome "bin")
    Add-TuanChatPathEntry -PathEntry (Join-Path $Config.AdbSdkRoot "platform-tools")
    Add-TuanChatPathEntry -PathEntry (Join-Path $Config.EmulatorAndroidSdkRoot "emulator")
}

function Write-TuanChatLocalProperties {
    param([Parameter(Mandatory = $true)]$Config)

    if (-not (Test-Path $Config.AndroidDir)) {
        return
    }

    $localPropertiesPath = Join-Path $Config.AndroidDir "local.properties"
    $localProperties = @(
        "sdk.dir=$(Convert-ToGradlePath $Config.BuildAndroidSdkRoot)"
    ) -join "`r`n"

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($localPropertiesPath, "$localProperties`r`n", $utf8NoBom)
}

function Set-TuanChatMobileAndroidBuildEnvironment {
    param([Parameter(Mandatory = $true)]$Config)

    Initialize-TuanChatMobileAndroidWorkspace -Config $Config

    $env:JAVA_HOME = $Config.JavaHome
    $env:ANDROID_HOME = $Config.BuildAndroidSdkRoot
    $env:ANDROID_SDK_ROOT = $Config.BuildAndroidSdkRoot
    $env:GRADLE_USER_HOME = $Config.GradleUserHome
    $env:TEMP = $Config.TempRoot
    $env:TMP = $Config.TempRoot

    Add-TuanChatPathEntry -PathEntry (Join-Path $Config.JavaHome "bin")
    Add-TuanChatPathEntry -PathEntry (Join-Path $Config.AdbSdkRoot "platform-tools")

    $gradleTmpOpt = "-Djava.io.tmpdir=$($Config.TempRoot)"
    if ([string]::IsNullOrWhiteSpace($env:GRADLE_OPTS)) {
        $env:GRADLE_OPTS = $gradleTmpOpt
    }
    elseif ($env:GRADLE_OPTS -notmatch [regex]::Escape($gradleTmpOpt)) {
        $env:GRADLE_OPTS = "$gradleTmpOpt $env:GRADLE_OPTS"
    }

    Write-TuanChatLocalProperties -Config $Config
}

function Get-TuanChatAdbPath {
    param([Parameter(Mandatory = $true)]$Config)

    $adbPath = Join-Path $Config.AdbSdkRoot "platform-tools\adb.exe"
    if (-not (Test-Path $adbPath)) {
        throw "adb.exe not found: $adbPath"
    }

    return $adbPath
}

function Get-TuanChatEmulatorPath {
    param([Parameter(Mandatory = $true)]$Config)

    $emulatorPath = Join-Path $Config.EmulatorAndroidSdkRoot "emulator\emulator.exe"
    if (-not (Test-Path $emulatorPath)) {
        throw "emulator.exe not found: $emulatorPath"
    }

    return $emulatorPath
}

function Get-TuanChatAvailableAvds {
    param([Parameter(Mandatory = $true)]$Config)

    Set-TuanChatMobileAndroidEnvironment -Config $Config
    return @(& (Get-TuanChatEmulatorPath -Config $Config) -list-avds)
}

function Get-TuanChatAdbDevices {
    param([Parameter(Mandatory = $true)]$Config)

    $adbPath = Get-TuanChatAdbPath -Config $Config
    $rawOutput = @(& $adbPath devices)
    $devices = @()

    foreach ($line in $rawOutput | Select-Object -Skip 1) {
        if ($line -match '^(?<serial>\S+)\s+(?<state>\S+)$') {
            $devices += [PSCustomObject]@{
                Serial = $matches.serial
                State  = $matches.state
            }
        }
    }

    return $devices
}

function Get-TuanChatRunningEmulators {
    param([Parameter(Mandatory = $true)]$Config)

    $adbPath = Get-TuanChatAdbPath -Config $Config
    $running = @()

    foreach ($device in (Get-TuanChatAdbDevices -Config $Config | Where-Object { $_.Serial -like "emulator-*" })) {
        $avdOutput = @(& $adbPath -s $device.Serial emu avd name 2>$null)
        $avdLine = $avdOutput | Select-Object -First 1
        if ($null -eq $avdLine) {
            continue
        }

        $avdName = "$avdLine".Trim()
        if ([string]::IsNullOrWhiteSpace($avdName)) {
            continue
        }

        $bootCompleted = $false
        if ($device.State -eq "device") {
            $bootLine = @(& $adbPath -s $device.Serial shell getprop sys.boot_completed 2>$null) | Select-Object -First 1
            $bootCompleted = "$bootLine".Trim() -eq "1"
        }

        $running += [PSCustomObject]@{
            Serial        = $device.Serial
            State         = $device.State
            AvdName       = $avdName
            BootCompleted = $bootCompleted
        }
    }

    return $running
}

function Wait-TuanChatAvdBoot {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$AvdName,
        [int]$TimeoutSeconds = 240
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastStateSummary = "No emulator serial was reported by adb."

    while ((Get-Date) -lt $deadline) {
        $matchingDevices = @(Get-TuanChatRunningEmulators -Config $Config | Where-Object { $_.AvdName -eq $AvdName })
        if ($matchingDevices.Count -gt 0) {
            $lastStateSummary = ($matchingDevices | ForEach-Object { "$($_.Serial) [$($_.State)] boot=$($_.BootCompleted)" }) -join ", "
        }

        $matchedDevice = $matchingDevices |
            Where-Object { $_.State -eq "device" -and $_.BootCompleted } |
            Select-Object -First 1

        if ($matchedDevice) {
            return $matchedDevice.Serial
        }

        Start-Sleep -Seconds 2
    }

    throw "AVD $AvdName did not finish booting within $TimeoutSeconds seconds. Last observed state: $lastStateSummary"
}

function Start-TuanChatAndroidEmulator {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [string]$AvdName = $Config.DefaultAvdName,
        [int]$TimeoutSeconds = 240
    )

    Set-TuanChatMobileAndroidEnvironment -Config $Config

    $availableAvds = Get-TuanChatAvailableAvds -Config $Config
    if ($availableAvds -notcontains $AvdName) {
        $availableText = ($availableAvds | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ", "
        throw "AVD '$AvdName' was not found. Available AVDs: $availableText"
    }

    $runningDevice = Get-TuanChatRunningEmulators -Config $Config |
        Where-Object { $_.AvdName -eq $AvdName } |
        Select-Object -First 1

    if ($runningDevice) {
        return Wait-TuanChatAvdBoot -Config $Config -AvdName $AvdName -TimeoutSeconds $TimeoutSeconds
    }

    $adbPath = Get-TuanChatAdbPath -Config $Config
    & $adbPath start-server | Out-Null

    Start-Process -FilePath (Get-TuanChatEmulatorPath -Config $Config) -ArgumentList @(
        "-avd", $AvdName,
        "-gpu", "swiftshader_indirect",
        "-no-boot-anim",
        "-netdelay", "none",
        "-netspeed", "full",
        "-crash-report-mode", "never"
    ) -WorkingDirectory $Config.WorkspaceRoot | Out-Null

    return Wait-TuanChatAvdBoot -Config $Config -AvdName $AvdName -TimeoutSeconds $TimeoutSeconds
}

function Test-TuanChatTcpPortReady {
    param([int]$Port)

    foreach ($loopbackHost in @("localhost", "[::1]", "127.0.0.1")) {
        try {
            $response = Invoke-WebRequest -Uri "http://${loopbackHost}:$Port/status" -UseBasicParsing -TimeoutSec 2
            $content = $response.Content
            if ($content -is [byte[]]) {
                $content = [System.Text.Encoding]::UTF8.GetString($content)
            }
            if ("$content" -match "packager-status:running") {
                return $true
            }
        }
        catch {
            continue
        }
    }

    return $false
}

function Wait-TuanChatTcpPortReady {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TuanChatTcpPortReady -Port $Port) {
            return $true
        }

        Start-Sleep -Seconds 2
    }

    throw "Port $Port was not ready within $TimeoutSeconds seconds."
}

function Start-TuanChatExpoWindow {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [int]$Port = $Config.MetroPort,
        [switch]$Android
    )

    if (Test-TuanChatTcpPortReady -Port $Port) {
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

function Invoke-TuanChatExpoRunAndroid {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$AvdName,
        [int]$Port = $Config.MetroPort
    )

    Set-TuanChatMobileAndroidBuildEnvironment -Config $Config

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

function Test-TuanChatAppInstalled {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$DeviceSerial
    )

    $adbPath = Get-TuanChatAdbPath -Config $Config
    $packages = @(& $adbPath -s $DeviceSerial shell pm list packages $Config.AppPackage 2>$null)
    return [bool]($packages | Select-String -Pattern "package:$($Config.AppPackage)" -Quiet)
}

function Get-TuanChatTopActivity {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$DeviceSerial
    )

    $adbPath = Get-TuanChatAdbPath -Config $Config
    $activityDump = @(& $adbPath -s $DeviceSerial shell dumpsys activity activities 2>$null)
    $matchedLine = $activityDump |
        Select-String -Pattern "topResumedActivity|mResumedActivity|$([regex]::Escape($Config.MainActivity))|$([regex]::Escape($Config.AppPackage))" |
        Select-Object -First 1

    if ($matchedLine) {
        return $matchedLine.Line.Trim()
    }

    return $null
}
