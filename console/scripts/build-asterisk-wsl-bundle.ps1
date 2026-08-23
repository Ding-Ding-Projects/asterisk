[CmdletBinding()]
param([switch]$Force)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$resourceRoot = Join-Path $repoRoot 'console\resources'
$bundlePath = Join-Path $resourceRoot 'asterisk-wsl-rootfs.tar'
$provenancePath = Join-Path $resourceRoot 'asterisk-wsl-rootfs.json'
$dockerfile = Join-Path $PSScriptRoot 'asterisk-wsl-runtime.Dockerfile'
$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
$baseDigest = 'sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517'

function Get-Sha256([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}

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
    # Resolve tar explicitly rather than through PATH. GNU tar - which Git for Windows
    # puts on PATH - reads a leading drive letter as an rsh host specification, so
    # `tar -tf C:\path` tries to contact a machine called "C" and lists nothing:
    #   /usr/bin/tar: Cannot connect to C: resolve failed
    # It exits without a usable listing, every required-entry check then fails, and the
    # error blames the rootfs for something that is wrong with the listing. Windows ships
    # bsdtar at System32, which reads drive letters correctly.
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (-not (Test-Path -LiteralPath $tar)) { $tar = 'tar' }
    $entries = @(& $tar -tf $temporary)
    # A listing that came back empty is a broken listing, not an empty archive. Say which,
    # or the next person spends an afternoon looking for a file that was always there.
    if ($entries.Count -eq 0) {
        throw "Listing the exported rootfs produced no entries using '$tar'. The archive is $((Get-Item -LiteralPath $temporary).Length) bytes, so this is a listing failure rather than an empty archive."
    }
    # docker export writes bare paths, but other producers prefix them with './'. Accept
    # either rather than failing on a cosmetic difference in how the archive was written.
    $normalised = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($entry in $entries) { [void]$normalised.Add(($entry -replace '^\./', '').TrimEnd('/')) }
    foreach ($required in @('usr/sbin/asterisk','usr/share/ding-pbx/bundle-manifest.json','etc/wsl.conf','etc/systemd/system/asterisk.service')) {
        if (-not $normalised.Contains($required)) { throw "Bundled rootfs is missing $required (listed $($entries.Count) entries)" }
    }
    if (-not ($entries | Where-Object { $_ -like 'usr/lib/asterisk/modules/*.so' } | Select-Object -First 1)) { throw 'Bundled rootfs contains no Asterisk modules.' }
    if (Test-Path -LiteralPath $bundlePath) { Remove-Item -LiteralPath $bundlePath -Force }
    Move-Item -LiteralPath $temporary -Destination $bundlePath
    $file = Get-Item -LiteralPath $bundlePath
    $provenance = [ordered]@{
        schemaVersion = 1; sourceCommit = $sourceCommit; baseImage = 'ubuntu:24.04'; baseDigest = $baseDigest
        runtime = 'wsl2-linux-amd64'; sha256 = Get-Sha256 $bundlePath; bytes = $file.Length
        generatedAt = [DateTimeOffset]::UtcNow.ToString('o')
        contents = @('complete Ubuntu root filesystem','Asterisk executable and modules','all apt-installed runtime libraries','systemd unit','WSL configuration','sample Asterisk configuration')
    }
    [System.IO.File]::WriteAllText($provenancePath, ($provenance | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))
    Write-Host ("Created {0} ({1} bytes, sha256:{2})." -f $bundlePath,$file.Length,$provenance.sha256)
} finally {
    if ($containerCreated) { docker rm --force $container | Out-Null }
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
