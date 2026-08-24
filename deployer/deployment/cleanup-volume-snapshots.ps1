[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)] [string]$SnapshotParent,
    [int]$RetentionDays = 14,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if ($RetentionDays -lt 1) { throw 'RetentionDays must be positive.' }
if (-not [System.IO.Path]::IsPathRooted($SnapshotParent)) { throw 'SnapshotParent must be an absolute path.' }
$parent = [System.IO.Path]::GetFullPath($SnapshotParent)
if ($parent.StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or $parent.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'SnapshotParent must be outside the repository.' }
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'SnapshotParent does not exist.' }
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
    if ($record.schemaVersion -ne 1 -or $journal.schemaVersion -ne 1 -or $journal.state -ne 'complete' -or $journal.recoverability -ne 'verified' -or $transaction.state -ne 'complete' -or -not $archivesValid -or $recordItem.LastWriteTimeUtc -gt $cutoff) { continue }
    $candidates += $directory
}
if (-not $Execute) { $candidates | ForEach-Object { Write-Host "Retention candidate: $($_.FullName)" }; exit 0 }
foreach ($directory in $candidates) {
    if ($PSCmdlet.ShouldProcess($directory.FullName, 'Remove verified expired snapshot directory')) { Remove-Item -LiteralPath $directory.FullName -Recurse -Force }
}
Write-Host "Removed $($candidates.Count) verified expired snapshot directories."
