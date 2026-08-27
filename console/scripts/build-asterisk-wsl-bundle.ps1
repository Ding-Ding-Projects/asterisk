<#
.SYNOPSIS
    Compiles Asterisk from this checkout in a container and exports the root filesystem.

.DESCRIPTION
    This is the fallback/compile producer of console/resources/asterisk-wsl-rootfs.tar.
    It is what build-asterisk-wsl-bundle-from-image.ps1 falls back to when no published
    image is available for the exact commit being built, and it is what CI's own
    build-asterisk-runtime job still calls directly, because that job's entire purpose
    is to do the one real compile a commit needs.

    When DING_PBX_PUBLISH_ASTERISK_IMAGE=1 is set, this script also best-effort
    publishes the image it just compiled - tagged and digest-pinned by the exact source
    commit - so a later run (a contributor's machine, a re-run of this workflow, this
    script's own sibling) can pull and export instead of recompiling. Publication never
    fails this build: this script's job is to produce a correct rootfs, and a missing or
    invalid registry credential is not a defect in the rootfs.
#>
[CmdletBinding()]
param([switch]$Force)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'asterisk-wsl-rootfs-common.ps1')

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$resourceRoot = Join-Path $repoRoot 'console\resources'
$bundlePath = Join-Path $resourceRoot 'asterisk-wsl-rootfs.tar'
$provenancePath = Join-Path $resourceRoot 'asterisk-wsl-rootfs.json'
$dockerfile = Join-Path $PSScriptRoot 'asterisk-wsl-runtime.Dockerfile'
$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()

if (-not $Force -and (Test-Path -LiteralPath $bundlePath) -and (Test-Path -LiteralPath $provenancePath)) {
    $existing = Get-Content -Raw -LiteralPath $provenancePath | ConvertFrom-Json
    if ($existing.sourceCommit -eq $sourceCommit -and $existing.sha256 -eq (Get-Sha256 $bundlePath)) {
        Write-Host "Reusing bundled Asterisk WSL rootfs for $sourceCommit."
        exit 0
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is required to build the complete WSL rootfs payload.' }
docker info --format '{{.OSType}}/{{.Architecture}}' | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Docker is installed but its Linux engine is unavailable.' }

New-Item -ItemType Directory -Force -Path $resourceRoot | Out-Null
$suffix = $sourceCommit.Substring(0, 12)
$image = "ding-pbx-asterisk-runtime:$suffix"
$container = "ding-pbx-asterisk-export-$suffix-$PID"
$temporary = Join-Path $resourceRoot "asterisk-wsl-rootfs.$PID.tmp.tar"
$containerCreated = $false

try {
    docker build --file $dockerfile --build-arg "ASTERISK_SOURCE_REVISION=$sourceCommit" --tag $image $repoRoot
    if ($LASTEXITCODE -ne 0) { throw "docker build exited $LASTEXITCODE" }
    docker create --name $container $image | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "docker create exited $LASTEXITCODE" }
    $containerCreated = $true
    docker export --output $temporary $container
    if ($LASTEXITCODE -ne 0) { throw "docker export exited $LASTEXITCODE" }
    $entries = Get-AsteriskRootfsTarEntries -Path $temporary
    Test-AsteriskRootfsTarEntries -Entries $entries
    if (Test-Path -LiteralPath $bundlePath) { Remove-Item -LiteralPath $bundlePath -Force }
    Move-Item -LiteralPath $temporary -Destination $bundlePath

    $publication = [ordered]@{ published = $false; ref = $null; digest = $null; reason = 'not-attempted' }
    if ($env:DING_PBX_PUBLISH_ASTERISK_IMAGE -eq '1') {
        $owner = Get-AsteriskImageRepositoryOwner -RepoRoot $repoRoot
        $registry = Get-AsteriskImageRegistry
        $target = Resolve-AsteriskImageReference -Registry $registry -Owner $owner -SourceCommit $sourceCommit
        $publication = Publish-AsteriskRuntimeImage -LocalImage $image -TargetImage $target -RegistryHost $registry -User $env:DING_PBX_REGISTRY_USER -Token $env:DING_PBX_REGISTRY_TOKEN
    }

    $provenance = New-AsteriskRootfsProvenance -SourceCommit $sourceCommit -BundlePath $bundlePath -SourceMethod 'compiled' -ImageRef $publication.ref -ImageDigest $publication.digest
    [System.IO.File]::WriteAllText($provenancePath, ($provenance | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))
    $file = Get-Item -LiteralPath $bundlePath
    Write-Host ("Created {0} ({1} bytes, sha256:{2})." -f $bundlePath, $file.Length, $provenance.sha256)
    if ($publication.published) {
        Write-Host "Published the compiled image as $($publication.ref) ($($publication.digest))."
    } elseif ($env:DING_PBX_PUBLISH_ASTERISK_IMAGE -eq '1') {
        Write-Warning "Image publication was requested but did not succeed: $($publication.reason). The rootfs itself is still correct; provenance records it as compiled with no published image."
    }
} finally {
    if ($containerCreated) { docker rm --force $container | Out-Null }
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
