<#
.SYNOPSIS
  Ralph: run one agent per roadmap item, repeatedly, until the roadmap is clear.

.DESCRIPTION
  Each iteration starts an agent with no memory of the last one. State lives in
  ROADMAP.md, not in context, which is why the tick matters more than anything the
  agent says about itself.

  The loop stops for exactly three reasons, and reports which:
    * ralph/STOP exists          -- the brake, checked before every iteration
    * no unchecked items remain  -- the roadmap is clear, exit 0
    * -Max reached               -- only when a cap was asked for

.PARAMETER Max
  Iteration cap. Omit for uncapped, which is the configured default for this project.

.PARAMETER DryRun
  Print what each iteration would do and exit without invoking an agent.

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File ralph/loop.ps1
  pwsh -NoProfile -ExecutionPolicy Bypass -File ralph/loop.ps1 -Max 5
  New-Item ralph/STOP    # halts before the next iteration
#>
[CmdletBinding()]
param(
    [int]$Max = 0,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RalphRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $RalphRoot
$Roadmap   = Join-Path $RepoRoot 'ROADMAP.md'
$StopFile  = Join-Path $RalphRoot 'STOP'
$PromptFile= Join-Path $RalphRoot 'PROMPT.md'
$LogDir    = Join-Path $RalphRoot 'logs'

foreach ($required in @($Roadmap, $PromptFile)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Ralph cannot start: $required is missing."
    }
}
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Get-OpenItemCount {
    # The roadmap is the state machine. Count only real unchecked checkboxes at the
    # start of a line -- not the word "[ ]" appearing inside prose somewhere.
    $lines = Get-Content -LiteralPath $Roadmap
    @($lines | Where-Object { $_ -match '^\s*-\s\[\s\]\s' }).Count
}

function Get-FirstOpenItem {
    $lines = Get-Content -LiteralPath $Roadmap
    foreach ($line in $lines) {
        if ($line -match '^\s*-\s\[\s\]\s(.+)$') { return $Matches[1] }
    }
    return $null
}

function Resolve-Agent {
    # Resolved at run time rather than hard-coded, so a rename upstream is a clear
    # error here instead of a confusing failure three layers down.
    $candidate = Get-Command 'claude' -ErrorAction SilentlyContinue
    if ($null -eq $candidate) {
        throw "Ralph cannot start: no 'claude' command on PATH. Install the CLI, or run the loop where it is available."
    }
    return $candidate.Source
}

$agent = if ($DryRun) { '(dry run -- no agent resolved)' } else { Resolve-Agent }

Write-Host ''
Write-Host 'Ralph' -ForegroundColor Cyan
Write-Host "  repository : $RepoRoot"
Write-Host "  roadmap    : $(Get-OpenItemCount) item(s) still open"
Write-Host "  cap        : $(if ($Max -gt 0) { "$Max iteration(s)" } else { 'uncapped -- STOP file is the brake' })"
Write-Host "  agent      : $agent"
Write-Host "  stop with  : New-Item '$StopFile'"
Write-Host ''

$iteration = 0
while ($true) {

    if (Test-Path -LiteralPath $StopFile) {
        Write-Host "STOP file present. Halting before iteration $($iteration + 1)." -ForegroundColor Yellow
        exit 0
    }

    $open = Get-OpenItemCount
    if ($open -eq 0) {
        Write-Host 'ROADMAP.md has no unchecked items left. Ralph is done.' -ForegroundColor Green
        exit 0
    }

    if ($Max -gt 0 -and $iteration -ge $Max) {
        Write-Host "Reached the -Max cap of $Max with $open item(s) still open." -ForegroundColor Yellow
        exit 0
    }

    $iteration++
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $log   = Join-Path $LogDir "iteration-$('{0:d4}' -f $iteration)-$stamp.log"
    $next  = Get-FirstOpenItem

    Write-Host "--- iteration $iteration | $open open | $stamp" -ForegroundColor Cyan
    Write-Host "    next: $($next.Substring(0, [Math]::Min(96, $next.Length)))"

    if ($DryRun) {
        Write-Host '    (dry run -- not invoking the agent)'
        Write-Host ''
        # A dry run that looped forever on an unchanging roadmap would be a trap of its
        # own, so it walks one iteration and stops.
        exit 0
    }

    # Reconcile before handing over, so the agent never starts from a stale base and
    # never has to guess whether it is behind. Non-destructive by construction: a
    # fast-forward or nothing.
    Push-Location $RepoRoot
    try {
        & git fetch origin --quiet
        & git merge --ff-only origin/main 2>&1 | Out-Null
    } finally {
        Pop-Location
    }

    $before = Get-OpenItemCount

    Push-Location $RepoRoot
    try {
        # The agent runs headless and gets no interactive permission prompt. Without an
        # explicit tool allowlist every iteration reads the roadmap, says what it would do,
        # and changes nothing -- which is what the first run of this loop actually did, and
        # the ticked-nothing line below is the only reason it was noticed.
        # An allowlist rather than a blanket bypass, because the loop is uncapped.
        Get-Content -LiteralPath $PromptFile -Raw | & $agent -p --allowedTools "Bash,Read,Write,Edit,Glob,Grep,NotebookEdit" 2>&1 | Tee-Object -FilePath $log
        $agentExit = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    "EXIT=$agentExit" | Add-Content -LiteralPath $log

    $after = Get-OpenItemCount
    if ($after -ge $before) {
        # Not fatal -- an iteration may legitimately record a blocker rather than tick
        # anything. But say it out loud, because a loop that never reduces the count is
        # a loop burning money on a task it cannot finish, and silence is how that runs
        # all night.
        Write-Host "    no item was ticked this iteration ($before still open). See $log" -ForegroundColor Yellow
    } else {
        Write-Host "    ticked $($before - $after) item(s); $after remaining" -ForegroundColor Green
    }
    Write-Host ''
}
