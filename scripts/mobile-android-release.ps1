param(
    [string]$Variant = "Release",
    [string]$Architectures = "arm64-v8a",
    [switch]$AllArchitectures,
    [switch]$Clean
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

Write-Host "Android package build is starting..."
Write-Host "  Workspace: $($config.WorkspaceRoot)"
Write-Host "  Android Dir: $($config.AndroidDir)"
Write-Host "  Variant: $variantName"
Write-Host "  Architectures: $architecturesName"
Write-Host "  Clean: $Clean"

# Set environment variables (JAVA_HOME, ANDROID_HOME, etc.)
Set-AndroidDevBuildEnvironment -Config $config

# Also need to write local.properties
Write-AndroidDevLocalProperties -Config $config

$gradleWrapper = Join-Path $config.AndroidDir "gradlew.bat"
if (-not (Test-Path $gradleWrapper)) {
    throw "gradlew.bat not found: $gradleWrapper"
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

$apkOutputDir = Join-Path $config.AndroidDir "app\build\outputs\apk\$variantOutputName"
$apkFiles = @()
if (Test-Path $apkOutputDir) {
    $apkFiles = @(Get-ChildItem -LiteralPath $apkOutputDir -Filter "*.apk" -File | Sort-Object LastWriteTime -Descending)
}

if ($apkFiles.Count -eq 0) {
    Write-Error "Could not find the generated APK."
    exit 1
}

Write-Host "Android build finished successfully!"
foreach ($apkFile in $apkFiles) {
    Write-Host "APK Location: $($apkFile.FullName)"
}
