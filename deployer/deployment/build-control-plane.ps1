[CmdletBinding()]
param(
    [string]$Tag = '',
    [string]$Version = 'dev',
    [string]$OutputDirectory = '',
    [switch]$NoCache
)

$ErrorActionPreference = 'Stop'
$deploymentRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $deploymentRoot '..\..')).Path
$dockerfile = Join-Path $deploymentRoot 'control-plane.Dockerfile'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker is not available on PATH. Start a local Linux Docker engine before building; this script never contacts a host or deploys.'
}

$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceCommit -notmatch '^[0-9a-f]{40}$') {
    throw 'Could not resolve the exact source commit from the checkout.'
}
$dirty = @(& git -C $repoRoot status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect checkout state before building.' }
if ($dirty.Count -gt 0) {
    throw 'The build context has uncommitted changes. Commit the exact source revision before building a reproducible image.'
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = "ding-pbx-control-plane:$($sourceCommit.Substring(0, 12))"
}
$buildArgs = @(
    'build',
    '--file', $dockerfile,
    '--build-arg', "SOURCE_COMMIT=$sourceCommit",
    '--build-arg', "IMAGE_VERSION=$Version",
    '--label', "org.opencontainers.image.revision=$sourceCommit",
    '--label', "org.opencontainers.image.version=$Version",
    '--tag', $Tag
)
if ($NoCache) { $buildArgs += '--no-cache' }
$buildArgs += $repoRoot

Write-Host "Building hosted control plane from commit $sourceCommit with Docker's Linux engine."
Write-Host "Image tag: $Tag"
& docker @buildArgs
if ($LASTEXITCODE -ne 0) { throw "docker build exited with $LASTEXITCODE" }

$revision = (& docker image inspect $Tag --format '{{index .Config.Labels "org.opencontainers.image.revision"}}').Trim()
if ($LASTEXITCODE -ne 0 -or $revision -ne $sourceCommit) {
    throw "The built image revision label '$revision' does not match source commit $sourceCommit."
}
$imageId = (& docker image inspect $Tag --format '{{.Id}}').Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($imageId)) {
    throw 'Docker did not return an immutable local image identifier.'
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $deploymentRoot 'out'
}
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$record = [ordered]@{
    schemaVersion = 1
    sourceCommit = $sourceCommit
    image = $Tag
    imageId = $imageId
    imageVersion = $Version
    dockerfile = 'deployer/deployment/control-plane.Dockerfile'
    builtAt = [DateTimeOffset]::UtcNow.ToString('o')
    deployment = 'not performed by this script'
}
$recordPath = Join-Path $OutputDirectory 'control-plane-image.json'
[System.IO.File]::WriteAllText($recordPath, ($record | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))
Write-Host "Built image verified for source commit $sourceCommit."
Write-Host "Provenance record: $recordPath"
