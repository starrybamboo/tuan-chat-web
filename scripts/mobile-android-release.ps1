param(
    [string]$Variant = "Release",
    [string]$Architectures = "arm64-v8a",
    [switch]$AllArchitectures,
    [switch]$Clean,
    [switch]$SkipPrebuild,
    [switch]$UseLocalBackend,
    [string]$ApiBaseUrl = "",
    [string]$WebSocketUrl = ""
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "mobile-android-common.ps1")

$config = Get-TuanChatMobileAndroidConfig
$variantName = $Variant.Trim()
if ([string]::IsNullOrWhiteSpace($variantName)) {
    throw "Variant must not be empty."
}

if ($AllArchitectures) {
    $Architectures = "armeabi-v7a,arm64-v8a,x86,x86_64"
}

$architecturesName = $Architectures.Trim()
if ([string]::IsNullOrWhiteSpace($architecturesName)) {
    throw "Architectures must not be empty."
}

$variantOutputName = $variantName.ToLowerInvariant()
$apkOutputDir = Join-Path $config.AndroidDir "app\build\outputs\apk\$variantOutputName"

Write-Host "Android package build is starting..."
Write-Host "  Workspace: $($config.WorkspaceRoot)"
Write-Host "  Android Dir: $($config.AndroidDir)"
Write-Host "  Variant: $variantName"
Write-Host "  Architectures: $architecturesName"
Write-Host "  Clean: $Clean"
Write-Host "  Prebuild: $(-not $SkipPrebuild)"

# Set environment variables (JAVA_HOME, ANDROID_HOME, etc.)
Set-AndroidDevBuildEnvironment -Config $config

$effectiveApiBaseUrl = $ApiBaseUrl.Trim()
$effectiveWebSocketUrl = $WebSocketUrl.Trim()
if ($UseLocalBackend) {
    if ([string]::IsNullOrWhiteSpace($effectiveApiBaseUrl)) {
        $effectiveApiBaseUrl = "http://10.0.2.2:$($config.ApiPort)"
    }
    if ([string]::IsNullOrWhiteSpace($effectiveWebSocketUrl)) {
        $effectiveWebSocketUrl = "ws://10.0.2.2:8090"
    }
}

if (-not [string]::IsNullOrWhiteSpace($effectiveApiBaseUrl)) {
    $env:EXPO_PUBLIC_TUANCHAT_API_BASE_URL = $effectiveApiBaseUrl
    Write-Host "  Mobile API Base URL: $effectiveApiBaseUrl"
}
if (-not [string]::IsNullOrWhiteSpace($effectiveWebSocketUrl)) {
    $env:EXPO_PUBLIC_TUANCHAT_API_WS_URL = $effectiveWebSocketUrl
    Write-Host "  Mobile WebSocket URL: $effectiveWebSocketUrl"
}
if ($UseLocalBackend) {
    $env:EXPO_PUBLIC_ENABLE_LOCAL_ACCOUNT_LOGIN = "1"
    $env:EXPO_PUBLIC_CHAT_TIMING_TRACE = "1"
    $env:EXPO_PUBLIC_MOBILE_NOTIFICATION_TRACE = "1"
    Write-Host "  Local backend login and chat timing trace enabled."
}

# Also need to write local.properties
Write-AndroidDevLocalProperties -Config $config

if (-not $SkipPrebuild) {
    Write-Host "Syncing Expo Android native project..."
    $expoCliPath = Join-Path $config.WorkspaceRoot "node_modules\expo\bin\cli"
    if (-not (Test-Path $expoCliPath)) {
        throw "Expo CLI was not found: $expoCliPath"
    }

    Push-Location $config.MobileDir
    try {
        & node $expoCliPath prebuild --platform android --no-install | Out-Host
        $prebuildExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($prebuildExitCode -ne 0) {
        Write-Error "Expo prebuild failed with exit code $prebuildExitCode"
        exit $prebuildExitCode
    }

    # Expo prebuild can rewrite local.properties; keep the shared Android SDK path authoritative.
    Write-AndroidDevLocalProperties -Config $config
}

$buildStampTime = Get-Date
$buildStampGitHead = $null
$buildStampGitDirty = $false
try {
    $buildStampGitHead = (& git -C $config.WorkspaceRoot rev-parse --short=12 HEAD 2>$null).Trim()
    $buildStampGitDirty = @(& git -C $config.WorkspaceRoot status --short 2>$null).Count -gt 0
}
catch {
    $buildStampGitHead = $null
    $buildStampGitDirty = $false
}

$buildStamp = [ordered]@{
    package       = $config.AppPackage
    variant       = $variantName
    architectures = $architecturesName
    apiBaseUrl    = $env:EXPO_PUBLIC_TUANCHAT_API_BASE_URL
    webSocketUrl  = $env:EXPO_PUBLIC_TUANCHAT_API_WS_URL
    localBackend  = [bool]$UseLocalBackend
    builtAt       = $buildStampTime.ToString("yyyy-MM-ddTHH:mm:ss.fffzzz")
    builtAtUtc    = $buildStampTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    gitHead       = $buildStampGitHead
    gitDirty      = $buildStampGitDirty
}
$buildStampAssetsDir = Join-Path $config.AndroidDir "app\src\main\assets"
$buildStampPath = Join-Path $buildStampAssetsDir "tuanchat-build-stamp.json"
New-Item -ItemType Directory -Path $buildStampAssetsDir -Force | Out-Null
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($buildStampPath, (($buildStamp | ConvertTo-Json -Depth 4) + "`n"), $utf8NoBom)
Write-Host "Build Stamp: $($buildStamp.builtAt)"
Write-Host "Build Stamp Asset: $buildStampPath"

$gradleWrapper = Join-Path $config.AndroidDir "gradlew.bat"
if (-not (Test-Path $gradleWrapper)) {
    throw "gradlew.bat not found: $gradleWrapper"
}

if (Test-Path $apkOutputDir) {
    # Avoid reporting a stale APK when Gradle decides a task is up-to-date.
    Get-ChildItem -LiteralPath $apkOutputDir -Filter "*.apk" -File | Remove-Item -Force
}

$releaseCachePaths = @(
    (Join-Path $config.AndroidDir "app\build\generated\assets\react\$variantOutputName"),
    (Join-Path $config.AndroidDir "app\build\generated\res\react\$variantOutputName"),
    (Join-Path $config.AndroidDir "app\build\intermediates\assets\$variantOutputName"),
    (Join-Path $config.AndroidDir "app\build\intermediates\compressed_assets\$variantOutputName")
)

foreach ($releaseCachePath in $releaseCachePaths) {
    if (Test-Path $releaseCachePath) {
        Remove-Item -LiteralPath $releaseCachePath -Recurse -Force
    }
}

Push-Location $config.AndroidDir
try {
    if ($Clean) {
        & $gradleWrapper "clean" "--console=plain" | Out-Host
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }

    $gradleArgs = @(
        "app:assemble$variantName",
        "-x", "lint",
        "-PreactNativeArchitectures=$architecturesName",
        "--console=plain"
    )

    # We use assembleRelease to generate the APK
    # For Expo prebuild projects, this also triggers the JS bundle generation
    & $gradleWrapper @gradleArgs | Out-Host
    $gradleExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($gradleExitCode -ne 0) {
    Write-Error "Gradle build failed with exit code $gradleExitCode"
    exit $gradleExitCode
}

$apkFiles = @()
if (Test-Path $apkOutputDir) {
    $apkFiles = @(Get-ChildItem -LiteralPath $apkOutputDir -Filter "*.apk" -File | Sort-Object LastWriteTime -Descending)
}

if ($apkFiles.Count -eq 0) {
    Write-Error "Could not find the generated APK."
    exit 1
}

$appJsonPath = Join-Path $config.MobileDir "app.json"
$appJson = Get-Content -LiteralPath $appJsonPath -Raw -Encoding utf8 | ConvertFrom-Json
$expectedVersionName = [string]$appJson.expo.version
$expectedVersionCode = [string]$appJson.expo.android.versionCode

$aapt2 = Get-ChildItem -LiteralPath (Join-Path $config.BuildAndroidSdkRoot "build-tools") -Recurse -Filter "aapt2.exe" |
    Sort-Object FullName -Descending |
    Select-Object -First 1
if ($null -eq $aapt2) {
    throw "aapt2.exe not found under $($config.BuildAndroidSdkRoot)\build-tools"
}

foreach ($apkFile in $apkFiles) {
    $badging = (& $aapt2.FullName "dump" "badging" $apkFile.FullName | Select-Object -First 1)
    if ($badging -notmatch "^package:\s+name='[^']+'\s+versionCode='([^']+)'\s+versionName='([^']+)'") {
        throw "Could not read APK version from: $($apkFile.FullName)"
    }

    $actualVersionCode = $Matches[1]
    $actualVersionName = $Matches[2]
    if ($actualVersionCode -ne $expectedVersionCode -or $actualVersionName -ne $expectedVersionName) {
        throw "Generated APK version mismatch. Expected versionCode=$expectedVersionCode versionName=$expectedVersionName, got versionCode=$actualVersionCode versionName=$actualVersionName."
    }

    Write-Host "APK Version: versionCode=$actualVersionCode versionName=$actualVersionName"
}

Write-Host "Android build finished successfully!"
foreach ($apkFile in $apkFiles) {
    Write-Host "APK Location: $($apkFile.FullName)"
}
