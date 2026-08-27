[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)] [string]$SnapshotParent,
    [Parameter(Mandatory)] [string]$SnapshotEncryptionKeyFile,
    [Parameter(Mandatory)] [string]$TaskManifestPath,
    [int]$RetentionDays = 14,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'provenance.ps1')
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
if ($RetentionDays -lt 1) { throw 'RetentionDays must be positive.' }
if (-not [System.IO.Path]::IsPathRooted($SnapshotParent)) { throw 'SnapshotParent must be an absolute path.' }
$parent = [System.IO.Path]::GetFullPath($SnapshotParent)
if ($parent.StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or $parent.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'SnapshotParent must be outside the repository.' }
$cursor = $parent
while ($cursor -and $cursor -ne [System.IO.Path]::GetPathRoot($cursor)) { if ((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'SnapshotParent cannot traverse a link or reparse point.' }; $cursor = [System.IO.Path]::GetDirectoryName($cursor) }
if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'SnapshotParent does not exist.' }
if (-not [System.IO.Path]::IsPathRooted($SnapshotEncryptionKeyFile) -or [System.IO.Path]::GetFullPath($SnapshotEncryptionKeyFile).StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $SnapshotEncryptionKeyFile -PathType Leaf)) { throw 'SnapshotEncryptionKeyFile must be an existing protected file outside the repository.' }
$keyCursor = [System.IO.Path]::GetFullPath($SnapshotEncryptionKeyFile)
while ($keyCursor -and $keyCursor -ne [System.IO.Path]::GetPathRoot($keyCursor)) { if ((Get-Item -LiteralPath $keyCursor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'SnapshotEncryptionKeyFile cannot traverse a link or reparse point.' }; $keyCursor = [System.IO.Path]::GetDirectoryName($keyCursor) }
if (-not [System.IO.Path]::IsPathRooted($TaskManifestPath)) { throw 'TaskManifestPath must be absolute and outside the repository.' }
$manifestFull = [System.IO.Path]::GetFullPath($TaskManifestPath)
if ($manifestFull.StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or $manifestFull.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'TaskManifestPath must be outside the repository.' }
if (-not (Test-Path -LiteralPath $manifestFull -PathType Leaf)) { throw 'TaskManifestPath must name the explicit task-owned deployment manifest.' }
$manifestCursor = $manifestFull
while ($manifestCursor -and $manifestCursor -ne [System.IO.Path]::GetPathRoot($manifestCursor)) { if ((Get-Item -LiteralPath $manifestCursor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'TaskManifestPath cannot traverse a link or reparse point.' }; $manifestCursor = [System.IO.Path]::GetDirectoryName($manifestCursor) }
$taskManifest = Get-Content -Raw -LiteralPath $manifestFull | ConvertFrom-Json
$manifestSchema = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'deployment-manifest.schema.json') | ConvertFrom-Json
Assert-DeploymentManifestSchemaPowerShell -Value $taskManifest -Rule $manifestSchema | Out-Null
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
        if ([long]$archiveItem.Length -ne [long]$archive.encryptedBytes -or $archiveDigest -ne [string]$archive.encryptedSha256 -or $archive.formatVersion -ne 2 -or $archive.keyDerivation -ne 'HKDF-SHA256' -or $archive.encryption -ne 'AES-256-CBC+HMAC-SHA256' -or $archive.archiveHeader.magic -ne 'DING-PBX-SNAPSHOT' -or $archive.archiveHeader.formatVersion -ne 2 -or $archive.archiveHeader.keyDerivation -ne 'HKDF-SHA256' -or $archive.archiveHeader.algorithm -ne 'AES-256-CBC+HMAC-SHA256' -or $archive.archiveHeader.snapshotId -ne $record.snapshotId -or $archive.archiveHeader.volume -ne $archive.volume -or $archive.archiveHeader.keyId -ne $record.snapshotKeyId) { $archivesValid = $false; break }
    }
    $expectedVolumes = @('ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool')
    $expectedInventory = @([pscustomobject]@{volume='ding-pbx-control-plane-data';projectLabel='ding-pbx';volumeLabel='control-plane-data'},[pscustomobject]@{volume='ding-pbx-control-plane-asterisk-etc';projectLabel='ding-pbx';volumeLabel='asterisk-etc'},[pscustomobject]@{volume='ding-pbx-control-plane-asterisk-lib';projectLabel='ding-pbx';volumeLabel='asterisk-lib'},[pscustomobject]@{volume='ding-pbx-control-plane-asterisk-log';projectLabel='ding-pbx';volumeLabel='asterisk-log'},[pscustomobject]@{volume='ding-pbx-control-plane-asterisk-spool';projectLabel='ding-pbx';volumeLabel='asterisk-spool'}); $inventoryValid = @($record.persistentVolumeInventory).Count -eq $expectedInventory.Count; for ($index = 0; $inventoryValid -and $index -lt $expectedInventory.Count; $index++) { $inventoryValid = [string]$record.persistentVolumeInventory[$index].volume -eq $expectedInventory[$index].volume -and [string]$record.persistentVolumeInventory[$index].projectLabel -eq $expectedInventory[$index].projectLabel -and [string]$record.persistentVolumeInventory[$index].volumeLabel -eq $expectedInventory[$index].volumeLabel }
    if ($record.schemaVersion -ne 1 -or $record.snapshotId -notmatch '^[0-9a-f]{32}$' -or $record.snapshotKeyId -ne $taskManifest.snapshotKeyId -or $record.projectName -ne $taskManifest.projectName -or [int]$record.adminPort -ne [int]$taskManifest.adminPort -or $record.target -ne $taskManifest.target -or $record.targetHost -ne $taskManifest.targetHost -or $record.targetUser -ne $taskManifest.targetUser -or [int]$record.targetSshPort -ne [int]$taskManifest.targetSshPort -or $record.inventoryPath -ne $taskManifest.inventoryPath -or $journal.snapshotId -ne $record.snapshotId -or $record.sourceImage -ne $taskManifest.image -or $record.sourceCommit -ne $taskManifest.sourceCommit -or $record.sourceTreeSha256 -ne $taskManifest.sourceTreeSha256 -or $record.dockerfileSha256 -ne $taskManifest.dockerfileSha256 -or $record.consoleLockSha256 -ne $taskManifest.consoleLockSha256 -or $record.inputManifestSha256 -ne $taskManifest.inputManifestSha256 -or $record.aptSbomSha256 -ne $taskManifest.aptSbomSha256 -or $record.volumeSchemaVersion -ne $taskManifest.volumeSchemaVersion -or $record.mountProfile -ne 'five-volumes-plus-run-tmpfs' -or (@($record.volumes) -join '|') -ne ($expectedVolumes -join '|') -or -not $inventoryValid -or $journal.schemaVersion -ne 1 -or $journal.state -ne 'complete' -or $journal.recoverability -ne 'verified' -or $transaction.state -ne 'complete' -or -not $archivesValid -or $recordItem.LastWriteTimeUtc -gt $cutoff) { continue }
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
