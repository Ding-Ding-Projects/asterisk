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

# Route 2a: a published release asset for this exact commit.
#
# Preferred over the registry because it needs no container engine and no registry
# credential at all - a release asset is a plain HTTPS download that anyone who can see
# the repository can fetch. That matters more than it sounds: the registry push has been
# refused for lack of a package-write scope on every release so far, so the pull route it
# feeds has never had anything to pull.
#
# The digest is checked against the provenance that travels beside the tar, and a
# mismatch discards both rather than accepting a payload that does not match its own
# record. A wrong root filesystem is worse than a slow one.
if (-not $Force) {
    try {
        $gh = Get-Command gh -ErrorAction SilentlyContinue
        if ($gh) {
            $tag = (& gh release list --repo (Get-AsteriskRepositorySlug -RepoRoot $repoRoot) --limit 40 --json tagName --jq '.[].tagName' 2>$null)
            foreach ($candidate in $tag) {
                $names = (& gh release view $candidate --repo (Get-AsteriskRepositorySlug -RepoRoot $repoRoot) --json assets --jq '.assets[].name' 2>$null)
                if ($names -notcontains 'asterisk-wsl-rootfs.json') { continue }
                $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("ding-rootfs-" + [System.Guid]::NewGuid().ToString('N'))
                New-Item -ItemType Directory -Force -Path $tmp | Out-Null
                try {
                    & gh release download $candidate --repo (Get-AsteriskRepositorySlug -RepoRoot $repoRoot) --pattern 'asterisk-wsl-rootfs.json' --dir $tmp 2>$null | Out-Host
                    $candidateProvenance = [System.IO.File]::ReadAllText((Join-Path $tmp 'asterisk-wsl-rootfs.json'), [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                    if ($candidateProvenance.sourceCommit -ne $sourceCommit) { continue }
                    & gh release download $candidate --repo (Get-AsteriskRepositorySlug -RepoRoot $repoRoot) --pattern 'asterisk-wsl-rootfs.tar' --dir $tmp 2>$null | Out-Host
                    $downloaded = Join-Path $tmp 'asterisk-wsl-rootfs.tar'
                    if (-not (Test-Path -LiteralPath $downloaded)) { continue }
                    $actual = Get-Sha256 $downloaded
                    if ($actual -ne $candidateProvenance.sha256) {
                        Write-Warning "Release asset on $candidate does not match its own recorded digest; discarding it."
                        continue
                    }
                    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $bundlePath) | Out-Null
                    Move-Item -Force -LiteralPath $downloaded -Destination $bundlePath
                    Move-Item -Force -LiteralPath (Join-Path $tmp 'asterisk-wsl-rootfs.json') -Destination $provenancePath
                    Write-Host "Reused the published root filesystem from release $candidate for $sourceCommit - no compile, no container engine."
                    exit 0
                } finally {
                    Remove-Item -Recurse -Force -LiteralPath $tmp -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {
        Write-Warning "No usable published root filesystem asset for $sourceCommit ($($_.Exception.Message)). Trying the registry, then a local compile."
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
