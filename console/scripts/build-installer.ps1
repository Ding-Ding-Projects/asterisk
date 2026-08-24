[CmdletBinding()]
param(
    [switch]$Silent,
    [string]$Version = $env:DING_PBX_VERSION,
    [string]$CandidateCommit = $env:DING_PBX_CANDIDATE_COMMIT
)

$ErrorActionPreference = 'Stop'
$started = [DateTimeOffset]::UtcNow
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$bootstrap = Join-Path $repoRoot 'download-dependencies.bat'
$node = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'dependency-manifest.json') | ConvertFrom-Json | Select-Object -ExpandProperty dependencies | Where-Object id -eq 'node-win-x64'
$nodeRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) ("DingPBX\toolchains\{0}" -f $node.archiveRoot)
$npm = Join-Path $nodeRoot 'npm.cmd'
$output = Join-Path $repoRoot 'console\dist\squirrel-windows\squirrel-windows'

function Phase([string]$Message) { Write-Host ("[{0:HH:mm:ss}] {1}" -f [DateTime]::Now, $Message) }

function Get-Sha256([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}

function Test-UnsignedPortableExecutable([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $reader = [System.IO.BinaryReader]::new($stream)
    try {
        if ($reader.ReadUInt16() -ne 0x5A4D) { throw "$Path is not a PE file" }
        $stream.Position = 0x3C
        $peOffset = $reader.ReadInt32()
        $stream.Position = $peOffset
        if ($reader.ReadUInt32() -ne 0x00004550) { throw "$Path has an invalid PE signature" }
        $optionalHeader = $peOffset + 24
        $stream.Position = $optionalHeader
        $magic = $reader.ReadUInt16()
        $dataDirectory = if ($magic -eq 0x10B) { $optionalHeader + 96 } elseif ($magic -eq 0x20B) { $optionalHeader + 112 } else { throw "$Path has an unsupported PE optional-header format" }
        $stream.Position = $dataDirectory + (4 * 8)
        $certificateOffset = $reader.ReadUInt32()
        $certificateSize = $reader.ReadUInt32()
        return $certificateOffset -eq 0 -and $certificateSize -eq 0
    } finally { $reader.Dispose(); $stream.Dispose() }
}
function Assert-IdentityArtifact($IdentityRecord, [System.IO.FileInfo]$File) {
    if ($IdentityRecord.name -ne $File.Name -or [long]$IdentityRecord.size -ne [long]$File.Length -or $IdentityRecord.sha256 -ne (Get-Sha256 $File.FullName)) { throw "release identity digest binding does not match artifact $($File.Name)" }
}

$headCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $headCommit -notmatch '^[0-9a-f]{40}$') { throw 'Could not resolve the exact candidate commit from the checkout.' }
if ([string]::IsNullOrWhiteSpace($CandidateCommit)) { $CandidateCommit = $headCommit }
if ($CandidateCommit -ne $headCommit) { throw "Candidate commit $CandidateCommit does not match checkout HEAD $headCommit." }
if ([string]::IsNullOrWhiteSpace($Version)) { $Version = (Get-Content -Raw (Join-Path $repoRoot 'console\package.json') | ConvertFrom-Json).version }
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version '$Version' must be numeric semantic version text." }
$env:DING_PBX_VERSION = $Version
$env:DING_PBX_CANDIDATE_COMMIT = $CandidateCommit

try {
    Phase 'Bootstrapping all packaging dependencies.'
    $bootstrapArgs = @()
    if ($Silent) { $bootstrapArgs += '/s' }
    & $bootstrap @bootstrapArgs
    if ($LASTEXITCODE -ne 0) { throw "download-dependencies.bat exited $LASTEXITCODE" }
    $env:PATH = "$nodeRoot;$env:PATH"
    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    $env:CSC_LINK = ''
    $env:CSC_KEY_PASSWORD = ''

    if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Recurse -Force }
    Phase 'Building the unsigned Squirrel.Windows installer through the project packaging script.'
    Push-Location (Join-Path $repoRoot 'console')
    try {
        & $npm run package:squirrel
        if ($LASTEXITCODE -ne 0) { throw "npm run package:squirrel exited $LASTEXITCODE" }
    } finally { Pop-Location }

    $setup = @(Get-ChildItem -LiteralPath $output -File -Filter '*Setup.exe')
    $releases = @(Get-ChildItem -LiteralPath $output -File -Filter 'RELEASES')
    $full = @(Get-ChildItem -LiteralPath $output -File -Filter '*-full.nupkg')
    $delta = @(Get-ChildItem -LiteralPath $output -File -Filter '*-delta.nupkg')
    $bundledRootfs = Join-Path $repoRoot 'console\dist\squirrel-windows\win-unpacked\resources\asterisk\asterisk-wsl-rootfs.tar'
    $bundledProvenance = Join-Path $repoRoot 'console\dist\squirrel-windows\win-unpacked\resources\asterisk\asterisk-wsl-rootfs.json'
    $bundledTrusted = Join-Path $repoRoot 'console\dist\squirrel-windows\win-unpacked\resources\asterisk\asterisk-wsl-trusted-manifest.json'
    $bundledReleaseManifest = Join-Path $repoRoot 'console\dist\squirrel-windows\win-unpacked\resources\asterisk\asterisk-wsl-release-manifest.json'
    $bundledInstallerBinding = Join-Path $repoRoot 'console\dist\squirrel-windows\win-unpacked\resources\asterisk\asterisk-wsl-installer-binding.json'
    if ($setup.Count -ne 1) { throw "expected exactly one Setup.exe under $output; found $($setup.Count)" }
    if ($releases.Count -ne 1) { throw "expected exactly one RELEASES under $output; found $($releases.Count)" }
    if ($full.Count -lt 1) { throw "expected at least one full .nupkg under $output; found none" }
    $identityPath = Join-Path $output 'release-identity.json'
    if (-not (Test-Path -LiteralPath $identityPath)) { throw 'packaged output is missing release-identity.json' }
    $identity = Get-Content -Raw -LiteralPath $identityPath | ConvertFrom-Json
    if ($identity.schemaVersion -ne 1 -or $identity.product -ne 'ding-pbx-console') { throw 'release identity schema or product is invalid' }
    if ($identity.version -ne $Version -or $identity.candidateCommit -ne $CandidateCommit) { throw 'release identity does not match the package version and candidate commit' }
    Assert-IdentityArtifact $identity.artifacts.setup $setup[0]
    Assert-IdentityArtifact $identity.artifacts.releases $releases[0]
    foreach ($package in $full) { $identityRecord = @($identity.artifacts.fullPackages | Where-Object name -eq $package.Name); if ($identityRecord.Count -ne 1) { throw "release identity does not contain exactly one record for $($package.Name)" }; Assert-IdentityArtifact $identityRecord[0] $package }
    foreach ($package in $delta) { $identityRecord = @($identity.artifacts.deltaPackages | Where-Object name -eq $package.Name); if ($identityRecord.Count -ne 1) { throw "release identity does not contain exactly one record for $($package.Name)" }; Assert-IdentityArtifact $identityRecord[0] $package }
    if (-not (Test-Path -LiteralPath $bundledRootfs)) { throw 'packaged application is missing the bundled Asterisk WSL rootfs' }
    if (-not (Test-Path -LiteralPath $bundledProvenance)) { throw 'packaged application is missing Asterisk bundle provenance' }
    if (-not (Test-Path -LiteralPath $bundledTrusted) -or -not (Test-Path -LiteralPath $bundledReleaseManifest) -or -not (Test-Path -LiteralPath $bundledInstallerBinding)) { throw 'packaged application is missing the trusted WSL release binding' }
    $bundleRecord = Get-Content -Raw -LiteralPath $bundledProvenance | ConvertFrom-Json
    $releaseRecord = Get-Content -Raw -LiteralPath $bundledReleaseManifest | ConvertFrom-Json
    $trustedRecord = Get-Content -Raw -LiteralPath $bundledTrusted | ConvertFrom-Json
    $bindingRecord = Get-Content -Raw -LiteralPath $bundledInstallerBinding | ConvertFrom-Json
    if ($bundleRecord.sha256 -ne (Get-Sha256 $bundledRootfs)) { throw 'packaged Asterisk WSL rootfs does not match its provenance digest' }
    if ($bundleRecord.sourceCommit -ne (& git -C $repoRoot rev-parse HEAD).Trim()) { throw 'packaged Asterisk WSL rootfs came from a different source commit' }
    if ($releaseRecord.trustedManifestSha256 -ne (Get-Sha256 $bundledTrusted) -or $releaseRecord.rootfsSha256 -ne $bundleRecord.sha256 -or $trustedRecord.rootfsSha256 -ne $bundleRecord.sha256 -or $bindingRecord.schemaVersion -ne 1 -or $bindingRecord.bindingKind -ne 'packaged-installer-wsl-release' -or $bindingRecord.candidateCommit -ne $CandidateCommit -or $bindingRecord.packageVersion -ne $Version -or $bindingRecord.releaseManifestSha256 -ne (Get-Sha256 $bundledReleaseManifest)) { throw 'packaged WSL installer binding does not match the exact release manifest, package, or candidate' }
    if ($identity.wslReleaseManifestSha256 -ne $bindingRecord.releaseManifestSha256) { throw 'release identity does not bind the packaged WSL release manifest digest' }
    $releaseText = Get-Content -Raw -LiteralPath $releases[0].FullName
    foreach ($package in $full) {
        if ($package.Name -notmatch [regex]::Escape("-$Version-full.nupkg")) { throw "$($package.Name) does not carry package version $Version" }
        if ($releaseText -notmatch [regex]::Escape($package.Name)) { throw "RELEASES does not reference $($package.Name)" }
    }
    foreach ($package in $delta) { if ($releaseText -notmatch [regex]::Escape($package.Name)) { throw "RELEASES does not reference $($package.Name)" } }
    if ($identity.artifacts.setup.name -ne $setup[0].Name -or $identity.artifacts.releases.name -ne $releases[0].Name) { throw 'release identity does not name the exact Setup.exe and RELEASES artifacts' }
    if (@($identity.artifacts.fullPackages).Count -ne $full.Count) { throw 'release identity does not enumerate every full package' }
    $hashLines = Get-ChildItem -LiteralPath $output -File | Where-Object Name -ne 'SHA256SUMS.txt' | Sort-Object Name | ForEach-Object { "{0}  {1}" -f (Get-Sha256 $_.FullName), $_.Name }
    $hashLines | Set-Content -Encoding ascii (Join-Path $output 'SHA256SUMS.txt')
    if (-not (Test-UnsignedPortableExecutable $setup[0].FullName)) { throw 'code-signing policy violation: Setup.exe contains an Authenticode certificate table' }

    Phase 'Installer verification complete. Artifacts are intentionally unsigned.'
    Get-ChildItem -LiteralPath $output -File | Sort-Object Name | ForEach-Object {
        $hash = Get-Sha256 $_.FullName
        Write-Host ("{0}  {1} bytes  sha256:{2}" -f $_.FullName, $_.Length, $hash)
    }
    Phase ("Installer build complete in {0:c}." -f ([DateTimeOffset]::UtcNow - $started))
    exit 0
} catch {
    Write-Error "Installer build failed after $(([DateTimeOffset]::UtcNow - $started).ToString('c')): $($_.Exception.Message)"
    exit 1
}
