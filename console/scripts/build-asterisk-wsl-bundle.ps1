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

try {
    docker build --file $dockerfile --build-arg "ASTERISK_SOURCE_REVISION=$sourceCommit" --tag $image $repoRoot
    if ($LASTEXITCODE -ne 0) { throw "docker build exited $LASTEXITCODE" }
    docker create --name $container $image | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "docker create exited $LASTEXITCODE" }
    docker export --output $temporary $container
    if ($LASTEXITCODE -ne 0) { throw "docker export exited $LASTEXITCODE" }
    $entries = @(tar -tf $temporary)
    foreach ($required in @('usr/sbin/asterisk','usr/share/ding-pbx/bundle-manifest.json','etc/wsl.conf','etc/systemd/system/asterisk.service')) {
        if ($required -notin $entries) { throw "Bundled rootfs is missing $required" }
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
    docker rm --force $container 2>$null | Out-Null
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
