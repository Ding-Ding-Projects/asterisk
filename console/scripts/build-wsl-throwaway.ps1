<#
.SYNOPSIS
    Creates a throwaway WSL distribution running the Asterisk built from this checkout.

.DESCRIPTION
    A disposable target to test against. Every configuration write this project can make
    is irreversible on a real PBX, so there has to be somewhere safe to point it, and
    "somewhere safe" has to be one command to create and one command to destroy or
    nobody will use it.

    Each instance gets its own name, its own disk and its own directory, so several can
    exist at once and removing one never touches another - and never touches the
    console's own `ding-pbx-console` distribution, which this script will not create,
    reuse or remove.

    Touchless: no prompts, no elevation, no interactive input. The virtual disk lives
    under the user's own local application data.

.PARAMETER Remove
    Removes throwaway instances instead of creating one. With -Name, removes that one;
    otherwise removes every instance this script created.

.PARAMETER Silent
    Suppresses progress output. Failures are still reported and the exit code still
    distinguishes success from failure.
#>
[CmdletBinding()]
param(
    [switch]$Remove,
    [switch]$Silent,
    [string]$Name,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$consoleRoot = Join-Path $repoRoot 'console'
$rootfs = Join-Path $consoleRoot 'resources\asterisk-wsl-rootfs.tar'

# Every instance carries this prefix. Removal matches on it, so a distribution the user
# made themselves can never be caught by a sweep - and neither can the console's own.
$prefix = 'ding-pbx-throwaway-'
$managed = 'ding-pbx-console'
$instanceRoot = Join-Path $env:LOCALAPPDATA 'ding-pbx-throwaway'

function Say([string]$Message) { if (-not $Silent) { Write-Host "[throwaway] $Message" } }

function Get-Instances {
    # `wsl --list --quiet` emits UTF-16 with embedded nulls when redirected.
    $raw = (& wsl.exe --list --quiet) -join "`n"
    return @($raw -split "`r?`n" | ForEach-Object { $_.Trim() -replace "`0", '' } | Where-Object { $_ })
}

if ($Remove) {
    $existing = Get-Instances
    $targets = if ($Name) { @($existing | Where-Object { $_ -eq $Name }) } else { @($existing | Where-Object { $_.StartsWith($prefix) }) }

    # Refuse by name rather than by accident. The managed distribution is the console's
    # own and is not this script's to remove, whatever it is asked.
    if ($Name -and $Name -eq $managed) { throw "$managed is the console's own distribution and is not a throwaway. Refusing to remove it." }
    if ($Name -and -not $Name.StartsWith($prefix)) { throw "$Name is not a throwaway instance created by this script. Refusing to remove it." }

    if ($targets.Count -eq 0) { Say 'No throwaway instances to remove.'; exit 0 }
    foreach ($target in $targets) {
        Say "Removing $target"
        & wsl.exe --unregister $target | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "wsl --unregister $target exited $LASTEXITCODE" }
        $dir = Join-Path $instanceRoot $target
        if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
    }
    Say "Removed $($targets.Count) instance(s)."
    exit 0
}

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) { throw 'WSL is not available on this machine.' }

# Build the root filesystem only if it is not already here. Compiling Asterisk is slow,
# and a throwaway instance is not worth waiting for twice.
if ($Force -or -not (Test-Path -LiteralPath $rootfs)) {
    Say 'Building the Asterisk root filesystem (this compiles Asterisk and takes a while).'
    $bundleArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'build-asterisk-wsl-bundle.ps1'))
    if ($Force) { $bundleArgs += '-Force' }
    & powershell.exe @bundleArgs
    if ($LASTEXITCODE -ne 0) { throw "Building the root filesystem failed with exit code $LASTEXITCODE." }
}
if (-not (Test-Path -LiteralPath $rootfs)) { throw "The root filesystem is still missing at $rootfs." }

$stamp = [DateTimeOffset]::UtcNow.ToString('yyyyMMdd-HHmmss')
$instance = if ($Name) { $Name } else { "$prefix$stamp" }
if (-not $instance.StartsWith($prefix)) { throw "A throwaway instance name must begin with '$prefix'." }
if ($instance -in (Get-Instances)) { throw "$instance already exists." }

$directory = Join-Path $instanceRoot $instance
New-Item -ItemType Directory -Force -Path $directory | Out-Null

Say "Importing $instance from $rootfs"
& wsl.exe --import $instance $directory $rootfs --version 2 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "wsl --import exited $LASTEXITCODE" }

# Ask the distribution itself rather than trusting the import's exit code. An import can
# succeed and still produce something that cannot run.
$version = (& wsl.exe -d $instance -- /usr/sbin/asterisk -V) -join ' '
if ($LASTEXITCODE -ne 0 -or -not $version) {
    Say 'The instance imported but Asterisk did not answer. Removing it rather than leaving a broken target behind.'
    & wsl.exe --unregister $instance | Out-Null
    if (Test-Path -LiteralPath $directory) { Remove-Item -LiteralPath $directory -Recurse -Force }
    throw 'Asterisk did not answer inside the imported instance.'
}

Say "Ready: $instance"
Say "  Asterisk : $($version.Trim())"
Say "  Disk     : $directory"
Say "  Shell    : wsl -d $instance"
Say "  Remove   : build-wsl-throwaway.bat /remove"
exit 0
