[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$SnapshotDirectory,
    [string]$ImageRef = '',
    [string]$ProjectName = 'ding-pbx-control-plane',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if (-not [System.IO.Path]::IsPathRooted($SnapshotDirectory)) { throw 'SnapshotDirectory must be an absolute path.' }
$snapshotPath = [System.IO.Path]::GetFullPath($SnapshotDirectory)
if ($snapshotPath.StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or $snapshotPath.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'SnapshotDirectory must be outside the repository.' }
$recordPath = Join-Path $snapshotPath 'snapshot-record.json'
if (-not (Test-Path -LiteralPath $recordPath -PathType Leaf)) { throw 'Snapshot record is missing.' }
$record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
if ($record.schemaVersion -ne 1 -or $record.volumeSchemaVersion -ne 1 -or $record.mountProfile -ne 'five-volumes-plus-run-tmpfs' -or @($record.volumes).Count -ne 5 -or @($record.archives).Count -ne 5) { throw 'Snapshot record is incomplete or incompatible with the five-volume deployment contract.' }
if ([string]::IsNullOrWhiteSpace($ImageRef)) { $ImageRef = [string]$record.sourceImage }
if ($ImageRef -notmatch '@sha256:[0-9a-f]{64}$') { throw 'ImageRef must be an immutable image@sha256 reference.' }

function Get-TarExecutable {
    if ($env:SystemRoot) {
        $candidate = Join-Path $env:SystemRoot 'System32\tar.exe'
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    $command = Get-Command tar.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    throw 'A tar executable is required to validate the snapshot archives.'
}

function Validate-Archive([string]$Path, $Expected) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Snapshot archive is missing: $Path" }
    $entries = @(& (Get-TarExecutable) -tf $Path 2>&1)
    if ($LASTEXITCODE -ne 0 -or $entries.Count -eq 0) { throw "Snapshot archive could not be reopened: $Path" }
    foreach ($entry in $entries) {
        $text = ([string]$entry).Trim()
        if ($text -match '(^/|^[A-Za-z]:|(^|/)\.\.(?:/|$))') { throw "Snapshot archive contains an unsafe path: $text" }
    }
    $item = Get-Item -LiteralPath $Path
    $digest = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ([long]$item.Length -ne [long]$Expected.bytes -or $digest -ne [string]$Expected.sha256) { throw "Snapshot archive integrity changed for $($Expected.volume)." }
}

foreach ($archive in @($record.archives)) { Validate-Archive (Join-Path $snapshotPath $archive.archive) $archive }
if (-not $Execute) {
    Write-Host "Plan only. Restore command is: powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\restore-volume-snapshots.ps1`" -SnapshotDirectory `"$snapshotPath`" -ImageRef `"$ImageRef`" -Execute"
    exit 0
}

foreach ($archive in @($record.archives)) {
    $helperName = "ding-pbx-restore-$([guid]::NewGuid().ToString('N'))"
    $helperId = (& docker run --detach --name $helperName --label "io.ding.pbx.snapshot-restore=$($record.snapshotId)" --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 256m --cpus 0.50 --tmpfs /tmp:rw,noexec,nosuid,size=8m --user 10001:10001 --entrypoint /bin/tar -v "$($archive.volume):/restore:rw" -v "${snapshotPath}:/backup:ro" $ImageRef -xf "/backup/$($archive.archive)" -C /restore).Trim()
    if ($LASTEXITCODE -ne 0 -or $helperId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start restore helper for $($archive.volume)." }
    try {
        do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $helperId 2>$null).Trim() } while ($state -eq 'running')
        $exitCode = (& docker inspect --format '{{.State.ExitCode}}' $helperId 2>$null).Trim()
        if ($exitCode -ne '0') { throw "Restore helper failed for $($archive.volume)." }
    } finally {
        $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-restore"}}' $helperId 2>$null).Trim()
        if ($owned -eq [string]$record.snapshotId) { & docker rm --force $helperId | Out-Null }
    }
}
Write-Host "Restored five persistent volumes from snapshot $($record.snapshotId)."
