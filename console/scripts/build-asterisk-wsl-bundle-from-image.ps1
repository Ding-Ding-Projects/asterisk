<#
.SYNOPSIS
    Obtains console/resources/asterisk-wsl-rootfs.tar by pulling the exact commit's
    published runtime image, falling back to a local compile only when no published
    image is available.

.DESCRIPTION
    This is the preferred packaging entry point (npm run bundle:asterisk /
    package:squirrel). In order:

      1. Reuse an already-present, already-valid bundle for this exact commit. This is
         what makes CI's Windows packaging job a no-op here: it downloads the tar and
         provenance that the Linux job already built, and this step just confirms them.
      2. Otherwise, pull the image tagged and digest-pinned by the exact source commit
         from the registry, and export its root filesystem - no compile.
      3. Otherwise, fall back to build-asterisk-wsl-bundle.ps1, which compiles Asterisk
         from this checkout exactly as it always has. A contributor with no registry
         access is never blocked by this script; they just pay the compile once, same
         as before this file existed.

    Every path writes the same provenance shape via New-AsteriskRootfsProvenance in
    asterisk-wsl-rootfs-common.ps1, with `sourceMethod` recording which of the three
    happened.
#>
[CmdletBinding()]
param([switch]$Force)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'asterisk-wsl-rootfs-common.ps1')

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$resourceRoot = Join-Path $repoRoot 'console\resources'
$bundlePath = Join-Path $resourceRoot 'asterisk-wsl-rootfs.tar'
$provenancePath = Join-Path $resourceRoot 'asterisk-wsl-rootfs.json'
$fallbackScript = Join-Path $PSScriptRoot 'build-asterisk-wsl-bundle.ps1'
$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()

if (-not $Force -and (Test-Path -LiteralPath $bundlePath) -and (Test-Path -LiteralPath $provenancePath)) {
    $existing = Get-Content -Raw -LiteralPath $provenancePath | ConvertFrom-Json
    if ($existing.sourceCommit -eq $sourceCommit -and $existing.sha256 -eq (Get-Sha256 $bundlePath)) {
        $method = if ($existing.sourceMethod) { $existing.sourceMethod } else { 'unknown' }
        Write-Host "Reusing bundled Asterisk WSL rootfs for $sourceCommit ($method)."
        exit 0
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker is required to obtain the complete WSL rootfs payload, either by pulling the published image or by compiling it locally.'
}

$registry = Get-AsteriskImageRegistry
$owner = Get-AsteriskImageRepositoryOwner -RepoRoot $repoRoot
$imageRef = Resolve-AsteriskImageReference -Registry $registry -Owner $owner -SourceCommit $sourceCommit

if (-not [string]::IsNullOrWhiteSpace($env:DING_PBX_REGISTRY_TOKEN) -and -not [string]::IsNullOrWhiteSpace($env:DING_PBX_REGISTRY_USER)) {
    # Best-effort: the image is expected to be public, but attempt an authenticated
    # pull when credentials happen to be present (this exact CI job, an authenticated
    # developer) rather than depending on the registry's visibility setting. A failed
    # login here never blocks the pull attempt below - it may still succeed anonymously.
    try {
        $env:DING_PBX_REGISTRY_TOKEN | docker login $registry --username $env:DING_PBX_REGISTRY_USER --password-stdin | Out-Host
        if ($LASTEXITCODE -ne 0) { Write-Warning "docker login to $registry exited $LASTEXITCODE; attempting an unauthenticated pull instead." }
    } catch {
        Write-Warning "docker login to $registry failed: $($_.Exception.Message). Attempting an unauthenticated pull instead."
    }
}

Write-Host "Attempting to pull the published Asterisk runtime image $imageRef for $sourceCommit ..."
$pulled = $false
$imageDigest = $null
try {
    docker pull $imageRef 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "docker pull exited $LASTEXITCODE" }
    $digestLine = ((& docker inspect --format '{{index .RepoDigests 0}}' $imageRef) | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($digestLine) -or $digestLine -notmatch '@(?<digest>sha256:[0-9a-f]{64})$') {
        throw "Could not resolve a digest for the pulled image $imageRef"
    }
    $imageDigest = $Matches['digest']
    $pulled = $true
} catch {
    Write-Warning "No usable published Asterisk runtime image for $sourceCommit ($($_.Exception.Message)). Falling back to a local compile."
}

if (-not $pulled) {
    & $fallbackScript @PSBoundParameters
    exit $LASTEXITCODE
}

New-Item -ItemType Directory -Force -Path $resourceRoot | Out-Null
$suffix = $sourceCommit.Substring(0, 12)
$container = "ding-pbx-asterisk-export-pulled-$suffix-$PID"
$temporary = Join-Path $resourceRoot "asterisk-wsl-rootfs.$PID.tmp.tar"
$containerCreated = $false

try {
    docker create --name $container $imageRef | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "docker create exited $LASTEXITCODE" }
    $containerCreated = $true
    docker export --output $temporary $container
    if ($LASTEXITCODE -ne 0) { throw "docker export exited $LASTEXITCODE" }
    $entries = Get-AsteriskRootfsTarEntries -Path $temporary
    Test-AsteriskRootfsTarEntries -Entries $entries
    if (Test-Path -LiteralPath $bundlePath) { Remove-Item -LiteralPath $bundlePath -Force }
    Move-Item -LiteralPath $temporary -Destination $bundlePath
    $provenance = New-AsteriskRootfsProvenance -SourceCommit $sourceCommit -BundlePath $bundlePath -SourceMethod 'pulled' -ImageRef $imageRef -ImageDigest $imageDigest
    [System.IO.File]::WriteAllText($provenancePath, ($provenance | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))
    $file = Get-Item -LiteralPath $bundlePath
    Write-Host ("Exported {0} from {1} ({2} bytes, sha256:{3})." -f $bundlePath, $imageRef, $file.Length, $provenance.sha256)
} finally {
    if ($containerCreated) { docker rm --force $container | Out-Null }
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
