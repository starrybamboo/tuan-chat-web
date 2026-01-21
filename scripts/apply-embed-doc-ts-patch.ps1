param(
  [Parameter(Mandatory = $true)]
  [string]$PatchDir
)

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$ts = Join-Path $PatchDir 'src\embed-synced-doc-block\embed-edgeless-synced-doc-block.ts'
if (-not (Test-Path $ts)) { throw "TS source not found: $ts" }

$content = [System.IO.File]::ReadAllText($ts)

# Ensure styleMap import exists (it should)
if ($content -notmatch "from 'lit/directives/style-map\.js'") {
  $content = $content -replace "(from 'lit/directives/guard\.js';\r?\n)", "`$1import { styleMap } from 'lit/directives/style-map.js';`r`n"
}

# Replace object assignment with styleMap({...})
$content = $content -replace 'this\.cardStyleMap\s*=\s*\{', 'this.cardStyleMap = styleMap({'
$content = $content -replace "transformOrigin: '0 0',\s*\r?\n\s*\};", "transformOrigin: '0 0',`r`n    });"

Write-Utf8NoBom -Path $ts -Content $content
