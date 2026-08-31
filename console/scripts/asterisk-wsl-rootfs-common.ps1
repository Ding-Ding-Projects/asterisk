<#
.SYNOPSIS
    Shared helpers for the two Asterisk WSL rootfs producers.

.DESCRIPTION
    Two scripts can produce console/resources/asterisk-wsl-rootfs.tar:

      build-asterisk-wsl-bundle.ps1            - compiles Asterisk in a container and
                                                  exports it (the fallback/compile path).
      build-asterisk-wsl-bundle-from-image.ps1 - pulls a published, digest-pinned image
                                                  for the exact source commit and exports
                                                  it (the preferred packaging path).

    Both need the identical required-entries check and the identical provenance shape,
    and keeping that logic in one file - rather than two copies that can quietly drift
    apart the first time only one of them is edited - is the whole reason this file
    exists. Dot-source it; nothing here is exported as a module because plain
    dot-sourcing is what the rest of this project's scripts already use.
#>

$Script:AsteriskRootfsRequiredEntries = @(
    'usr/sbin/asterisk',
    'usr/share/ding-pbx/bundle-manifest.json',
    'etc/wsl.conf',
    'etc/systemd/system/asterisk.service'
)
$Script:AsteriskRootfsSchemaVersion = 2
$Script:AsteriskRootfsBaseDigest = 'sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517'

function Get-Sha256([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}

function Get-AsteriskRootfsTarEntries([string]$Path) {
    # tar on PATH on Windows is GNU tar from Git for Windows, which reads a leading
    # drive letter as an rsh host specification, so `tar -tf C:\path` tries to contact
    # a machine called "C" and lists nothing:
    #   /usr/bin/tar: Cannot connect to C: resolve failed
    # It exits without a usable listing, every required-entry check then fails, and the
    # error blames the rootfs for something that is wrong with the listing. Windows
    # ships bsdtar at System32, which reads drive letters correctly. Only on Windows -
    # this file also runs under PowerShell on Linux, where $env:SystemRoot is null and
    # tar on PATH is simply correct.
    $tar = 'tar'
    if ($env:SystemRoot) {
        $windowsTar = Join-Path $env:SystemRoot 'System32\tar.exe'
        if (Test-Path -LiteralPath $windowsTar) { $tar = $windowsTar }
    }
    $entries = @(& $tar -tf $Path)
    # A listing that came back empty is a broken listing, not an empty archive. Say
    # which, or the next person spends an afternoon looking for a file that was always
    # there.
    if ($entries.Count -eq 0) {
        throw "Listing the exported rootfs produced no entries using '$tar'. The archive is $((Get-Item -LiteralPath $Path).Length) bytes, so this is a listing failure rather than an empty archive."
    }
    return $entries
}

function Test-AsteriskRootfsTarEntries([string[]]$Entries) {
    if ($null -eq $Entries -or $Entries.Count -eq 0) { throw 'Test-AsteriskRootfsTarEntries received no entries to check.' }
    # docker export writes bare paths, but other producers prefix them with './'.
    # Accept either rather than failing on a cosmetic difference in how the archive
    # was written.
    $normalised = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($entry in $Entries) { [void]$normalised.Add(($entry -replace '^\./', '').TrimEnd('/')) }
    foreach ($required in $Script:AsteriskRootfsRequiredEntries) {
        if (-not $normalised.Contains($required)) { throw "Bundled rootfs is missing $required (listed $($Entries.Count) entries)" }
    }
    if (-not ($Entries | Where-Object { $_ -like 'usr/lib/asterisk/modules/*.so' } | Select-Object -First 1)) {
        throw 'Bundled rootfs contains no Asterisk modules.'
    }
}

function Test-AsteriskRootfsProvenance {
    param(
        [Parameter(Mandatory)][object]$Provenance,
        [Parameter(Mandatory)][string]$BundlePath,
        [Parameter(Mandatory)][string]$ExpectedCommit
    )
    if ($ExpectedCommit -notmatch '^[0-9a-f]{40}$') { throw "Expected source commit is not a full lowercase SHA: $ExpectedCommit" }
    if ($null -eq $Provenance -or $Provenance.schemaVersion -ne $Script:AsteriskRootfsSchemaVersion) { throw 'Asterisk rootfs provenance has an unsupported schema version.' }
    if ($Provenance.sourceCommit -ne $ExpectedCommit) { throw 'Asterisk rootfs provenance belongs to a different source commit.' }
    if ($Provenance.sha256 -notmatch '^[0-9a-f]{64}$') { throw 'Asterisk rootfs provenance has a malformed bundle digest.' }
    if (-not (Test-Path -LiteralPath $BundlePath -PathType Leaf)) { throw "Asterisk rootfs bundle is missing: $BundlePath" }
    $file = Get-Item -LiteralPath $BundlePath
    $actualDigest = Get-Sha256 $BundlePath
    if ($Provenance.sha256 -ne $actualDigest) { throw 'Asterisk rootfs provenance digest does not match the bundle bytes.' }
    if ([int64]$Provenance.bytes -ne [int64]$file.Length) { throw 'Asterisk rootfs provenance byte count does not match the bundle.' }
    if ([string]::IsNullOrWhiteSpace([string]$Provenance.generatedAt) -or [DateTimeOffset]::Parse([string]$Provenance.generatedAt) -eq $null) { throw 'Asterisk rootfs provenance has no valid generatedAt timestamp.' }
    if ($Provenance.sourceMethod -notin @('compiled', 'pulled')) { throw 'Asterisk rootfs provenance has an unknown sourceMethod.' }
    $hasRef = -not [string]::IsNullOrWhiteSpace([string]$Provenance.imageRef)
    $hasDigest = -not [string]::IsNullOrWhiteSpace([string]$Provenance.imageDigest)
    if ($hasRef -ne $hasDigest) { throw 'Asterisk rootfs provenance imageRef and imageDigest are only valid as a pair.' }
    if ($Provenance.sourceMethod -eq 'pulled' -and -not $hasDigest) { throw 'A pulled Asterisk rootfs must carry image provenance.' }
    if ($hasDigest -and [string]$Provenance.imageDigest -notmatch '^sha256:[0-9a-f]{64}$') { throw 'Asterisk rootfs provenance imageDigest is malformed.' }
    return $true
}

function Get-AsteriskImageRegistry {
    if ($env:DING_PBX_ASTERISK_IMAGE_REGISTRY) { return $env:DING_PBX_ASTERISK_IMAGE_REGISTRY.Trim().ToLowerInvariant() }
    return 'ghcr.io'
}

function Get-AsteriskRepositorySlug([string]$RepoRoot) {
    # owner/repo as GitHub spells it, for the release command line -- deliberately NOT
    # lowercased, unlike the image-repository owner below. A registry path must be
    # lowercase; a repository slug is matched case-insensitively but is clearer left as
    # written, and the two are different enough that one shared helper would eventually
    # get one of them wrong.
    #
    # Split rather than match. A pattern written into this file through a shell arrived
    # truncated once already, and a broken pattern here would silently stop finding the
    # published root filesystem and quietly fall back to a four-minute compile.
    if ($env:GITHUB_REPOSITORY) { return $env:GITHUB_REPOSITORY }
    $remote = $null
    try { $remote = (& git -C $RepoRoot remote get-url origin 2>$null) } catch { $remote = $null }
    if ($remote) {
        $trimmed = $remote.Trim()
        if ($trimmed.EndsWith(".git")) { $trimmed = $trimmed.Substring(0, $trimmed.Length - 4) }
        $parts = $trimmed.Split(@("/", ":"), [System.StringSplitOptions]::RemoveEmptyEntries)
        if ($parts.Count -ge 2) {
            return "{0}/{1}" -f $parts[$parts.Count - 2], $parts[$parts.Count - 1]
        }
    }
    return "Ding-Ding-Projects/asterisk"
}
function Get-AsteriskImageRepositoryOwner([string]$RepoRoot) {
    # OCI registries require an all-lowercase repository path even when the GitHub
    # owner name carries uppercase letters (this project's own owner does), so the
    # lowercasing here is load-bearing, not cosmetic.
    if ($env:DING_PBX_ASTERISK_IMAGE_REPOSITORY) {
        $first = ($env:DING_PBX_ASTERISK_IMAGE_REPOSITORY -split '/')[0].Trim()
        if ($first) { return $first.ToLowerInvariant() }
    }
    $remote = $null
    try { $remote = (& git -C $RepoRoot remote get-url origin 2>$null) } catch { $remote = $null }
    if ($LASTEXITCODE -eq 0 -and $remote) {
        $match = [regex]::Match($remote.Trim(), '[:/](?<owner>[^/:]+)/(?<repo>[^/]+?)(\.git)?$')
        if ($match.Success) { return $match.Groups['owner'].Value.ToLowerInvariant() }
    }
    return 'ding-ding-projects'
}

function Resolve-AsteriskImageReference {
    param(
        [Parameter(Mandatory)][string]$Registry,
        [Parameter(Mandatory)][string]$Owner,
        [Parameter(Mandatory)][string]$SourceCommit
    )
    if ($SourceCommit -notmatch '^[0-9a-f]{40}$') { throw "Resolve-AsteriskImageReference requires a full 40-character commit SHA; got '$SourceCommit'." }
    if ([string]::IsNullOrWhiteSpace($Owner)) { throw 'Resolve-AsteriskImageReference requires a non-empty owner.' }
    if ([string]::IsNullOrWhiteSpace($Registry)) { throw 'Resolve-AsteriskImageReference requires a non-empty registry host.' }
    return '{0}/{1}/asterisk-runtime:{2}' -f $Registry.ToLowerInvariant(), $Owner.ToLowerInvariant(), $SourceCommit
}

function New-AsteriskRootfsProvenance {
    param(
        [Parameter(Mandatory)][string]$SourceCommit,
        [Parameter(Mandatory)][string]$BundlePath,
        [Parameter(Mandatory)][ValidateSet('compiled', 'pulled')][string]$SourceMethod,
        [string]$ImageRef,
        [string]$ImageDigest
    )
    if ($SourceCommit -notmatch '^[0-9a-f]{40}$') { throw "New-AsteriskRootfsProvenance requires a full lowercase source commit SHA; got '$SourceCommit'." }
    if (-not (Test-Path -LiteralPath $BundlePath -PathType Leaf)) { throw "Cannot write rootfs provenance for missing bundle: $BundlePath" }
    if ($SourceMethod -eq 'pulled' -and ([string]::IsNullOrWhiteSpace($ImageRef) -or [string]::IsNullOrWhiteSpace($ImageDigest))) {
        throw "A 'pulled' rootfs must record the image reference and digest it was pulled from."
    }
    if ((-not [string]::IsNullOrWhiteSpace($ImageRef)) -ne (-not [string]::IsNullOrWhiteSpace($ImageDigest))) {
        throw 'imageRef and imageDigest must be recorded together, or not at all.'
    }
    if (-not [string]::IsNullOrWhiteSpace($ImageDigest) -and $ImageDigest -notmatch '^sha256:[0-9a-f]{64}$') { throw 'imageDigest must be a sha256:<64 lowercase hex> digest.' }
    $file = Get-Item -LiteralPath $BundlePath
    return [ordered]@{
        schemaVersion = $Script:AsteriskRootfsSchemaVersion
        sourceCommit  = $SourceCommit
        baseImage     = 'ubuntu:24.04'
        baseDigest    = $Script:AsteriskRootfsBaseDigest
        runtime       = 'wsl2-linux-amd64'
        sha256        = Get-Sha256 $BundlePath
        bytes         = $file.Length
        generatedAt   = [DateTimeOffset]::UtcNow.ToString('o')
        contents      = @('complete Ubuntu root filesystem', 'Asterisk executable and modules', 'all apt-installed runtime libraries', 'systemd unit', 'WSL configuration', 'sample Asterisk configuration')
        sourceMethod  = $SourceMethod
        imageRef      = if ([string]::IsNullOrWhiteSpace($ImageRef)) { $null } else { $ImageRef }
        imageDigest   = if ([string]::IsNullOrWhiteSpace($ImageDigest)) { $null } else { $ImageDigest }
    }
}

function Publish-AsteriskRuntimeImage {
    <#
        Best-effort. This never throws: a failed publish must never fail the build that
        produced a perfectly good rootfs, because publication needs registry
        credentials that a local compile does not, and the caller has no way to know in
        advance whether they are present or valid. Callers read the returned
        `published` flag and continue either way.
    #>
    param(
        [Parameter(Mandatory)][string]$LocalImage,
        [Parameter(Mandatory)][string]$TargetImage,
        [Parameter(Mandatory)][string]$RegistryHost,
        [string]$User,
        [string]$Token
    )
    if ([string]::IsNullOrWhiteSpace($Token)) {
        Write-Warning 'No registry token was supplied; skipping publication of the Asterisk runtime image.'
        return [ordered]@{ published = $false; ref = $null; digest = $null; reason = 'no-token' }
    }
    if ([string]::IsNullOrWhiteSpace($User)) {
        Write-Warning 'No registry user was supplied; skipping publication of the Asterisk runtime image.'
        return [ordered]@{ published = $false; ref = $null; digest = $null; reason = 'no-user' }
    }
    try {
        $Token | docker login $RegistryHost --username $User --password-stdin | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "docker login exited $LASTEXITCODE" }
        docker tag $LocalImage $TargetImage
        if ($LASTEXITCODE -ne 0) { throw "docker tag exited $LASTEXITCODE" }
        docker push $TargetImage | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "docker push exited $LASTEXITCODE" }
        $digestLine = ((& docker inspect --format '{{index .RepoDigests 0}}' $TargetImage) | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($digestLine) -or $digestLine -notmatch '@(?<digest>sha256:[0-9a-f]{64})$') {
            throw "Could not resolve a digest for the pushed image $TargetImage"
        }
        $digest = $Matches['digest']
        Write-Host "Published $TargetImage ($digest)."
        return [ordered]@{ published = $true; ref = $TargetImage; digest = $digest; reason = $null }
    } catch {
        Write-Warning "Publishing the Asterisk runtime image failed: $($_.Exception.Message). The build continues with an unpublished, compiled-locally rootfs."
        return [ordered]@{ published = $false; ref = $null; digest = $null; reason = $_.Exception.Message }
    }
}
