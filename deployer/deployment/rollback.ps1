[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$PreviousImage,
    [Parameter(Mandatory)] [string]$CurrentImage,
    [Parameter(Mandatory)] [string]$TlsCertFile,
    [Parameter(Mandatory)] [string]$TlsKeyFile,
    [string]$ComposeFile = "$PSScriptRoot\docker-compose.yml",
    [string]$ProjectName = 'ding-pbx-control-plane',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Compose file does not exist: $ComposeFile" }
if ($PreviousImage -notmatch '@sha256:[0-9a-f]{64}$') { throw 'PreviousImage must be an immutable image@sha256 reference.' }
if ($CurrentImage -notmatch '@sha256:[0-9a-f]{64}$') { throw 'CurrentImage must be an immutable image@sha256 reference.' }

$command = @('compose', '--project-name', $ProjectName, '--file', $ComposeFile, 'up', '--detach', '--no-build')
Write-Host "Rollback plan: inspect provenance for $PreviousImage, then run: docker $($command -join ' ')"
Write-Host 'The previous image source commit and version are derived from its embedded provenance, not typed separately.'
Write-Host 'No data volume is removed. TLS material remains outside the image and outside logs.'

if (-not $Execute) {
    Write-Host 'Plan only. Re-run with -Execute after reviewing the immutable image and the target inventory.'
    exit 0
}

& (Join-Path $PSScriptRoot 'deploy-control-plane.ps1') `
    -ImageRef $PreviousImage `
    -PreviousImageRef $CurrentImage `
    -TlsCertFile $TlsCertFile `
    -TlsKeyFile $TlsKeyFile `
    -ComposeFile $ComposeFile `
    -ProjectName $ProjectName `
    -Execute
