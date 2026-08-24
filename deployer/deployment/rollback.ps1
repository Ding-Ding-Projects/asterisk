[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$PreviousImage,
    [Parameter(Mandatory)] [string]$CurrentImage,
    [Parameter(Mandatory)] [string]$TlsCertFile,
    [Parameter(Mandatory)] [string]$TlsKeyFile,
    [Parameter(Mandatory)] [string]$PreviousManifestPath,
    [Parameter(Mandatory)] [string]$CurrentManifestPath,
    [Parameter(Mandatory)] [string]$PreflightEvidencePath,
    [string]$SessionCookieFile = '',
    [string]$SnapshotDirectory = '',
    [string]$ComposeFile = "$PSScriptRoot\docker-compose.yml",
    [string]$ProjectName = 'ding-pbx-control-plane',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'provenance.ps1')
if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Compose file does not exist: $ComposeFile" }
if (-not (Test-Path -LiteralPath $PreviousManifestPath)) { throw "Previous manifest does not exist: $PreviousManifestPath" }
if (-not (Test-Path -LiteralPath $CurrentManifestPath)) { throw "Current manifest does not exist: $CurrentManifestPath" }
if (-not (Test-Path -LiteralPath $PreflightEvidencePath)) { throw "Preflight evidence does not exist: $PreflightEvidencePath" }
if ($PreviousImage -notmatch '@sha256:[0-9a-f]{64}$') { throw 'PreviousImage must be an immutable image@sha256 reference.' }
if ($CurrentImage -notmatch '@sha256:[0-9a-f]{64}$') { throw 'CurrentImage must be an immutable image@sha256 reference.' }
$previousManifest = Get-Content -Raw -LiteralPath $PreviousManifestPath | ConvertFrom-Json
$currentManifest = Get-Content -Raw -LiteralPath $CurrentManifestPath | ConvertFrom-Json
Assert-ExternalDeploymentManifest -Manifest $previousManifest -ManifestPath $PreviousManifestPath -ImageReference $PreviousImage -ProjectName $ProjectName -Port 8088 | Out-Null
Assert-ExternalDeploymentManifest -Manifest $currentManifest -ManifestPath $CurrentManifestPath -ImageReference $CurrentImage -ProjectName $ProjectName -Port 8088 | Out-Null
if ($currentManifest.preflightEvidencePath -ne $PreflightEvidencePath) { throw 'Current manifest does not bind to the supplied fresh preflight evidence.' }

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
    -ManifestPath $PreviousManifestPath `
    -PreviousManifestPath $CurrentManifestPath `
    -PreflightEvidencePath $PreflightEvidencePath `
    -SessionCookieFile $SessionCookieFile `
    -SnapshotDirectory $SnapshotDirectory `
    -ComposeFile $ComposeFile `
    -ProjectName $ProjectName `
    -Execute
