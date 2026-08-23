[CmdletBinding()]
param(
    [switch]$Silent,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$isoDir = Join-Path $PSScriptRoot 'iso'
$releaseDir = Join-Path $repoRoot 'console\release\iso'
$outputIso = Join-Path $releaseDir 'ding-pbx-installer.iso'
$provenancePath = Join-Path $releaseDir 'ding-pbx-installer.iso.json'

# Pinned Ubuntu 24.04.x Server (Subiquity) ISO. Update both the URL and the
# digest together, from https://releases.ubuntu.com/24.04/SHA256SUMS, never
# the digest alone.
#
# Verified 2026-08-23 against the published SHA256SUMS for this exact filename.
# Update the URL and the digest together, never the digest alone.
$ubuntuIsoUrl = 'https://releases.ubuntu.com/24.04/ubuntu-24.04.4-live-server-amd64.iso'
$ubuntuIsoSha256 = 'e907d92eeec9df64163a7e454cbc8d7755e8ddc7ed42f99dbc80c40f1a138433'
$nodeRuntimeVersion = '22.23.2'
# The Linux x64 tarball, which is a different file from the Windows archive
# HANDOFF.md pins. Verified against https://nodejs.org/dist/v22.23.2/SHASUMS256.txt
$nodeRuntimeSha256 = 'd60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307'

function Write-Phase([string]$Name) {
    if (-not $Silent) { Write-Host "`n=== $Name ===" -ForegroundColor Cyan }
    else { Write-Host "[build-iso] $Name" }
}

function Get-Sha256([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
if (-not $sourceCommit) { throw 'Could not resolve the current commit; is this a git checkout?' }
$buildTimestamp = [DateTimeOffset]::UtcNow.ToString('o')

Write-Phase "Phase 0: idempotence check"
if (-not $Force -and (Test-Path -LiteralPath $outputIso) -and (Test-Path -LiteralPath $provenancePath)) {
    $existing = Get-Content -Raw -LiteralPath $provenancePath | ConvertFrom-Json
    if ($existing.sourceCommit -eq $sourceCommit -and $existing.sha256 -eq (Get-Sha256 $outputIso)) {
        Write-Host "Reusing existing ISO for commit $sourceCommit ($outputIso)."
        exit 0
    }
}

Write-Phase "Phase 1: verify Docker is available"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker is required to build the ISO (a Windows host cannot compile the Linux payload or repack the ISO natively).'
}
docker info --format '{{.OSType}}/{{.Architecture}}' | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Docker is installed but its Linux engine is unavailable. Start Docker Desktop (Linux containers) and re-run.' }

Write-Phase "Phase 2: resolve the pinned Node.js console-build base image digest"
$consoleBaseImage = 'node:22.23.2-bookworm-slim'
$resolvedDigest = $null
try {
    $inspect = & docker buildx imagetools inspect $consoleBaseImage --format '{{json .Manifest}}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $inspect) {
        $manifest = $inspect | ConvertFrom-Json
        if ($manifest.digest) { $resolvedDigest = $manifest.digest }
    }
} catch { $resolvedDigest = $null }
$consoleBuildBaseImage = if ($resolvedDigest) { "$consoleBaseImage@$resolvedDigest" } else { $consoleBaseImage }
if (-not $resolvedDigest -and -not $Silent) {
    Write-Warning "Could not resolve a content digest for $consoleBaseImage; the console-build stage will not be pinned by digest for this run. Provenance records this."
}

Write-Phase "Phase 3: build the offline installer payload (Asterisk + Node runtime + console server)"
$payloadImage = "ding-pbx-iso-payload:$($sourceCommit.Substring(0,12))"
docker build `
    --file (Join-Path $isoDir 'iso-payload.Dockerfile') `
    --build-arg "ASTERISK_SOURCE_REVISION=$sourceCommit" `
    --build-arg "NODE_RUNTIME_VERSION=$nodeRuntimeVersion" `
    --build-arg "NODE_RUNTIME_SHA256=$nodeRuntimeSha256" `
    --build-arg "CONSOLE_BUILD_BASE_IMAGE=$consoleBuildBaseImage" `
    --target payload `
    --tag $payloadImage `
    $repoRoot
if ($LASTEXITCODE -ne 0) { throw "docker build (payload) exited $LASTEXITCODE" }

Write-Phase "Phase 4: export the payload from the built image"
$payloadDir = Join-Path $isoDir 'payload'
if (Test-Path -LiteralPath $payloadDir) { Remove-Item -LiteralPath $payloadDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $payloadDir | Out-Null
$exportContainer = "ding-pbx-iso-payload-export-$($sourceCommit.Substring(0,12))-$PID"
try {
    docker create --name $exportContainer $payloadImage | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "docker create exited $LASTEXITCODE" }
    docker cp "${exportContainer}:/payload/." $payloadDir
    if ($LASTEXITCODE -ne 0) { throw "docker cp exited $LASTEXITCODE" }
} finally {
    docker rm --force $exportContainer | Out-Null
}
foreach ($required in @('asterisk-root/usr/sbin/asterisk', 'console/dist-electron', 'runtime/node/bin/node', 'asterisk.service', 'provenance.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $payloadDir $required))) {
        throw "Exported payload is missing $required."
    }
}

Write-Phase "Phase 5: respin the Ubuntu Server ISO with the autoinstall answer file and the payload"
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$respinImage = "ding-pbx-iso-respin:$($sourceCommit.Substring(0,12))"
$respinContext = Join-Path $isoDir '.respin-context'
if (Test-Path -LiteralPath $respinContext) { Remove-Item -LiteralPath $respinContext -Recurse -Force }
New-Item -ItemType Directory -Force -Path $respinContext | Out-Null
Copy-Item -LiteralPath $payloadDir -Destination (Join-Path $respinContext 'payload') -Recurse
Copy-Item -LiteralPath (Join-Path $isoDir 'user-data') -Destination (Join-Path $respinContext 'user-data')
Copy-Item -LiteralPath (Join-Path $isoDir 'meta-data') -Destination (Join-Path $respinContext 'meta-data')
docker build `
    --file (Join-Path $isoDir 'iso-respin.Dockerfile') `
    --build-arg "UBUNTU_ISO_URL=$ubuntuIsoUrl" `
    --build-arg "UBUNTU_ISO_SHA256=$ubuntuIsoSha256" `
    --build-arg "SOURCE_COMMIT=$sourceCommit" `
    --build-arg "BUILD_TIMESTAMP=$buildTimestamp" `
    --tag $respinImage `
    $respinContext
if ($LASTEXITCODE -ne 0) { throw "docker build (respin) exited $LASTEXITCODE" }

Write-Phase "Phase 6: extract the produced ISO"
$respinContainer = "ding-pbx-iso-respin-export-$($sourceCommit.Substring(0,12))-$PID"
$tempIso = Join-Path $releaseDir "ding-pbx-installer.$PID.tmp.iso"
try {
    docker create --name $respinContainer $respinImage | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "docker create exited $LASTEXITCODE" }
    docker cp "${respinContainer}:/work/output.iso" $tempIso
    if ($LASTEXITCODE -ne 0) { throw "docker cp (output.iso) exited $LASTEXITCODE" }
} finally {
    docker rm --force $respinContainer | Out-Null
}

Write-Phase "Phase 7: verify the produced ISO"
if (-not (Test-Path -LiteralPath $tempIso)) { throw 'Respin did not produce output.iso.' }
$isoFile = Get-Item -LiteralPath $tempIso
if ($isoFile.Length -lt 500MB) { throw "Produced ISO is implausibly small ($($isoFile.Length) bytes) to contain a Ubuntu Server base plus the Ding PBX payload." }
# A bootable El Torito ISO 9660 image starts with a 32 KiB system area followed
# by the standard "CD001" primary volume descriptor signature at byte 32769.
$bytes = New-Object byte[] 6
$stream = [System.IO.File]::OpenRead($tempIso)
try { $stream.Seek(32769, 'Begin') | Out-Null; $stream.Read($bytes, 0, 6) | Out-Null }
finally { $stream.Dispose() }
$signature = [System.Text.Encoding]::ASCII.GetString($bytes)
if ($signature -ne 'CD001\0' -and $signature -ne 'CD001') {
    $trimmed = $signature.TrimEnd([char]0)
    if ($trimmed -ne 'CD001') { throw "Produced file does not carry a valid ISO 9660 primary volume descriptor (got '$trimmed')." }
}

if (Test-Path -LiteralPath $outputIso) { Remove-Item -LiteralPath $outputIso -Force }
Move-Item -LiteralPath $tempIso -Destination $outputIso
$finalFile = Get-Item -LiteralPath $outputIso
$isoSha256 = Get-Sha256 $outputIso

Write-Phase "Phase 8: record provenance"
$provenance = [ordered]@{
    schemaVersion       = 1
    sourceCommit        = $sourceCommit
    baseIso             = $ubuntuIsoUrl
    baseIsoSha256       = $ubuntuIsoSha256
    consoleBuildBaseImage = $consoleBuildBaseImage
    nodeRuntimeVersion  = $nodeRuntimeVersion
    nodeRuntimeSha256   = $nodeRuntimeSha256
    generatedAt         = $buildTimestamp
    sha256              = $isoSha256
    bytes               = $finalFile.Length
    secureBoot          = 'unsigned; this ISO is refused by Secure Boot unless the operator disables Secure Boot or enrolls their own key. See docs/app/... for detail.'
}
[System.IO.File]::WriteAllText($provenancePath, ($provenance | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))

Remove-Item -LiteralPath $payloadDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $respinContext -Recurse -Force -ErrorAction SilentlyContinue

$stopwatch.Stop()
Write-Host ("`nBuilt {0} ({1} bytes, sha256:{2}) from commit {3} in {4}." -f $outputIso, $finalFile.Length, $isoSha256, $sourceCommit, $stopwatch.Elapsed)
Write-Host 'This ISO is unsigned. Secure Boot will refuse it; disable Secure Boot or enroll a custom key before booting on hardware that enforces it.'
exit 0
