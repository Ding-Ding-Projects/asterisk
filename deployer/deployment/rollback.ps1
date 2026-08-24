[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$PreviousImage,
    [string]$ComposeFile = "$PSScriptRoot\docker-compose.yml",
    [string]$ProjectName = 'ding-pbx-control-plane',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Compose file does not exist: $ComposeFile" }
if ($PreviousImage -notmatch '^[a-zA-Z0-9./:@_-]+$') { throw 'PreviousImage must be an immutable image reference without shell syntax.' }

$command = @('compose', '--project-name', $ProjectName, '--file', $ComposeFile, 'up', '--detach', '--no-build')
Write-Host "Rollback plan: set DING_PBX_IMAGE=$PreviousImage, then run: docker $($command -join ' ')"
Write-Host 'The previous image must be verified against its recorded source commit before execution.'
Write-Host 'No data volume is removed. TLS material remains outside the image and outside logs.'

if (-not $Execute) {
    Write-Host 'Plan only. Re-run with -Execute after reviewing the immutable image and the target inventory.'
    exit 0
}

$env:DING_PBX_IMAGE = $PreviousImage
& docker @command
if ($LASTEXITCODE -ne 0) { throw "docker compose rollback exited with $LASTEXITCODE" }
