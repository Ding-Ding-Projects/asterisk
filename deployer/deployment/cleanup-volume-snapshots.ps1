[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)] [string]$SnapshotParent,
    [Parameter(Mandatory)] [string]$SnapshotEncryptionKeyFile,
    [int]$RetentionDays = 14,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if ($RetentionDays -lt 1) { throw 'RetentionDays must be positive.' }
if (-not [System.IO.Path]::IsPathRooted($SnapshotParent)) { throw 'SnapshotParent must be an absolute path.' }
$parent = [System.IO.Path]::GetFullPath($SnapshotParent)
if ($parent.StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or $parent.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'SnapshotParent must be outside the repository.' }
$cursor = $parent
while ($cursor -and $cursor -ne [System.IO.Path]::GetPathRoot($cursor)) { if ((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'SnapshotParent cannot traverse a link or reparse point.' }; $cursor = [System.IO.Path]::GetDirectoryName($cursor) }
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'SnapshotParent does not exist.' }
if (-not [System.IO.Path]::IsPathRooted($SnapshotEncryptionKeyFile) -or [System.IO.Path]::GetFullPath($SnapshotEncryptionKeyFile).StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $SnapshotEncryptionKeyFile -PathType Leaf)) { throw 'SnapshotEncryptionKeyFile must be an existing protected file outside the repository.' }
$keyItem = Get-Item -LiteralPath $SnapshotEncryptionKeyFile
if ($keyItem.Length -lt 16 -or $keyItem.Length -gt 128) { throw 'SnapshotEncryptionKeyFile has an invalid size.' }
$keyAcl = Get-Acl -LiteralPath $SnapshotEncryptionKeyFile
if (@($keyAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'SnapshotEncryptionKeyFile is readable by a broad group.' }
$cutoff = [DateTimeOffset]::UtcNow.AddDays(-$RetentionDays)
$candidates = @()
foreach ($directory in @(Get-ChildItem -LiteralPath $parent -Directory -Filter 'snapshot-*')) {
    $recordPath = Join-Path $directory.FullName 'snapshot-record.json'
    $journalPath = Join-Path $directory.FullName 'snapshot-journal.json'
    $transactionPath = Join-Path $directory.FullName 'recovery-transaction.json'
    if (-not (Test-Path -LiteralPath $recordPath -PathType Leaf) -or -not (Test-Path -LiteralPath $journalPath -PathType Leaf) -or -not (Test-Path -LiteralPath $transactionPath -PathType Leaf)) { continue }
    $record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
    $journal = Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json
    $transaction = Get-Content -Raw -LiteralPath $transactionPath | ConvertFrom-Json
    $recordItem = Get-Item -LiteralPath $recordPath
    $archivesValid = $true
    foreach ($archive in @($record.archives)) {
        $archivePath = Join-Path $directory.FullName $archive.archive
        if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) { $archivesValid = $false; break }
        $archiveItem = Get-Item -LiteralPath $archivePath
        $archiveDigest = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ([long]$archiveItem.Length -ne [long]$archive.encryptedBytes -or $archiveDigest -ne [string]$archive.encryptedSha256) { $archivesValid = $false; break }
    }
    $expectedVolumes = @('ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool')
    if ($record.schemaVersion -ne 1 -or $record.snapshotId -notmatch '^[0-9a-f]{32}$' -or $journal.snapshotId -ne $record.snapshotId -or $record.sourceImage -notmatch '@sha256:[0-9a-f]{64}$' -or $record.mountProfile -ne 'five-volumes-plus-run-tmpfs' -or (@($record.volumes) -join '|') -ne ($expectedVolumes -join '|') -or $journal.schemaVersion -ne 1 -or $journal.state -ne 'complete' -or $journal.recoverability -ne 'verified' -or $transaction.state -ne 'complete' -or -not $archivesValid -or $recordItem.LastWriteTimeUtc -gt $cutoff) { continue }
    $probe = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'restore-volume-snapshots.ps1') -SnapshotDirectory $directory.FullName -SnapshotEncryptionKeyFile $SnapshotEncryptionKeyFile 2>&1
    if ($LASTEXITCODE -ne 0) { continue }
    $candidates += $directory
}
if (-not $Execute) { $candidates | ForEach-Object { Write-Host "Retention candidate: $($_.FullName)" }; exit 0 }
foreach ($directory in $candidates) {
    if ($PSCmdlet.ShouldProcess($directory.FullName, 'Remove verified expired snapshot directory')) {
        $latest = Get-Item -LiteralPath $directory.FullName -ErrorAction Stop
        if ($latest.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Snapshot candidate became a reparse point before removal: $($directory.FullName)" }
        Remove-Item -LiteralPath $directory.FullName -Recurse -Force
    }
}
Write-Host "Removed $($candidates.Count) verified expired snapshot directories."
