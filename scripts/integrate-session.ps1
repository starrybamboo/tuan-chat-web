param(
  [string]$IntegrationBranch = "dev-jxc",
  [switch]$AutoCommit,
  [string]$CommitMessage = "chore: integrate session worktree",
  [switch]$DeleteBranch,
  [switch]$DryRun,
  [switch]$Yes
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)][string[]]$Args,
    [string]$WorkingDirectory
  )
  if ($WorkingDirectory) {
    & git -C "$WorkingDirectory" @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "git failed (cwd=$WorkingDirectory): git $($Args -join ' ')"
    }
    return
  }
  & git @Args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "git failed: git $($Args -join ' ')"
  }
}

function Get-GitText {
  param(
    [Parameter(Mandatory = $true)][string[]]$Args,
    [string]$WorkingDirectory
  )
  $output = if ($WorkingDirectory) { & git -C "$WorkingDirectory" @Args } else { & git @Args }
  if ($LASTEXITCODE -ne 0) {
    throw "git failed: git $($Args -join ' ')"
  }
  return ($output | Out-String).Trim()
}

function Get-Worktrees {
  $lines = (& git worktree list --porcelain) -split "`r?`n"
  if ($LASTEXITCODE -ne 0) {
    throw "git failed: git worktree list --porcelain"
  }
  $worktrees = @()
  $cur = $null
  foreach ($line in $lines) {
    if ($line -match "^worktree (.+)$") {
      if ($cur) { $worktrees += ,$cur }
      $cur = [ordered]@{ path = $Matches[1]; branch = $null; head = $null }
      continue
    }
    if (-not $cur) { continue }
    if ($line -match "^branch (.+)$") { $cur.branch = $Matches[1]; continue }
    if ($line -match "^HEAD (.+)$") { $cur.head = $Matches[1]; continue }
  }
  if ($cur) { $worktrees += ,$cur }
  return $worktrees
}

$repoRoot = Get-GitText @("rev-parse", "--show-toplevel")
$currentBranch = Get-GitText @("branch", "--show-current")
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
  throw "Not on a branch (detached HEAD)."
}

$worktrees = Get-Worktrees
$integrationRef = "refs/heads/$IntegrationBranch"
$integrationWorktree = $worktrees | Where-Object { $_.branch -eq $integrationRef } | Select-Object -First 1
if (-not $integrationWorktree) {
  throw "Integration worktree not found for branch: $IntegrationBranch"
}

$integrationPath = $integrationWorktree.path
$sessionPath = $repoRoot
$sessionBranch = $currentBranch

if ($sessionPath -eq $integrationPath) {
  throw "You are running on the integration worktree ($IntegrationBranch). Run this script from the session worktree."
}

$mainStatus = Get-GitText @("status", "--porcelain") $integrationPath
if ($mainStatus) {
  throw "Integration worktree has uncommitted changes: $integrationPath"
}

$sessionStatus = Get-GitText @("status", "--porcelain") $sessionPath
$needsCommit = -not [string]::IsNullOrEmpty($sessionStatus)

if ($needsCommit -and -not $AutoCommit -and -not $DryRun) {
  throw "Session worktree has uncommitted changes. Commit first or use -AutoCommit: $sessionPath"
}

if ($DryRun) {
  Write-Host "[DryRun] Planned actions:"
  Write-Host "- merge --no-ff $sessionBranch -> $IntegrationBranch"
  Write-Host "- worktree remove $sessionPath"
  if ($DeleteBranch) {
    Write-Host "- branch -d $sessionBranch"
  }
  if ($needsCommit) {
    if ($AutoCommit) {
      Write-Host "[DryRun] Session has uncommitted changes: will add+commit first (CommitMessage=$CommitMessage)"
    }
    else {
      Write-Host "[DryRun] Session has uncommitted changes: execution would stop (use -AutoCommit)"
    }
  }
  return
}

if ($needsCommit -and $AutoCommit) {
  Invoke-Git @("add", "-A") $sessionPath
  Invoke-Git @("commit", "-m", $CommitMessage) $sessionPath
}

if (-not $Yes) {
  Write-Host "About to run:"
  Write-Host "1) merge --no-ff $sessionBranch -> $IntegrationBranch"
  Write-Host "2) worktree remove $sessionPath"
  if ($DeleteBranch) {
    Write-Host "3) branch -d $sessionBranch"
  }
  if ($AutoCommit) {
    Write-Host "(AutoCommit enabled: will commit session changes if needed)"
  }
  $confirm = Read-Host "Continue? Type yes to proceed"
  if ($confirm -ne "yes") {
    throw "Canceled."
  }
}

Invoke-Git @("checkout", $IntegrationBranch) $integrationPath
Invoke-Git @("merge", "--no-ff", $sessionBranch) $integrationPath
Invoke-Git @("worktree", "remove", $sessionPath) $integrationPath

if ($DeleteBranch) {
  Invoke-Git @("branch", "-d", $sessionBranch) $integrationPath
}

Write-Host "Done: merged $sessionBranch -> $IntegrationBranch, removed worktree: $sessionPath"
