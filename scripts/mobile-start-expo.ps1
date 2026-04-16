param(
    [int]$Port,
    [switch]$Android
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "mobile-android-common.ps1")

$config = Get-TuanChatMobileAndroidConfig
if ($Port -le 0) {
    $Port = $config.MetroPort
}

Set-TuanChatMobileAndroidBuildEnvironment -Config $config

Push-Location $config.WorkspaceRoot
try {
    $expoArgs = @(
        "--filter", "@tuanchat/mobile",
        "exec", "expo", "start",
        "--port", "$Port",
        "--localhost"
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
