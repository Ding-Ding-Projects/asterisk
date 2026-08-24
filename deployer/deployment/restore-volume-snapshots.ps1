[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$SnapshotDirectory,
    [string]$ImageRef = '',
    [string]$ManifestPath = '',
    [string]$PreflightEvidencePath = '',
    [string]$SnapshotEncryptionKeyFile = '',
    [string]$TlsCertificateSha256 = '',
    [string]$SessionCookieFile = '',
    [string]$ComposeFile = "$PSScriptRoot\docker-compose.yml",
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
if ($Execute -and ([string]::IsNullOrWhiteSpace($ManifestPath) -or [string]::IsNullOrWhiteSpace($PreflightEvidencePath) -or [string]::IsNullOrWhiteSpace($SnapshotEncryptionKeyFile) -or $TlsCertificateSha256 -notmatch '^[0-9a-fA-F]{64}$' -or [string]::IsNullOrWhiteSpace($SessionCookieFile))) { throw 'Execute requires the compatible manifest, fresh preflight evidence, protected encryption key, TLS pin, and readiness credential.' }
if ([string]::IsNullOrWhiteSpace($SnapshotEncryptionKeyFile)) { throw 'SnapshotEncryptionKeyFile is required to validate encrypted snapshot archives.' }
if ($Execute) {
    foreach ($path in @($ManifestPath, $PreflightEvidencePath, $SnapshotEncryptionKeyFile, $SessionCookieFile)) {
        if (-not [System.IO.Path]::IsPathRooted($path) -or [System.IO.Path]::GetFullPath($path).StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Restore input paths must be absolute and outside the repository.' }
    }
    if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf) -or -not (Test-Path -LiteralPath $PreflightEvidencePath -PathType Leaf) -or -not (Test-Path -LiteralPath $SnapshotEncryptionKeyFile -PathType Leaf) -or -not (Test-Path -LiteralPath $SessionCookieFile -PathType Leaf)) { throw 'Restore inputs are incomplete.' }
    $keyItem = Get-Item -LiteralPath $SnapshotEncryptionKeyFile
    if ($keyItem.Length -lt 16 -or $keyItem.Length -gt 128) { throw 'Snapshot encryption key file must contain between 16 and 128 bytes.' }
    $keyAcl = Get-Acl -LiteralPath $SnapshotEncryptionKeyFile
    if (@($keyAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'Snapshot encryption key file is readable by a broad group.' }
}

function Get-Key { return ([System.Security.Cryptography.SHA256]::Create()).ComputeHash([System.IO.File]::ReadAllBytes($SnapshotEncryptionKeyFile)) }
function Get-Hmac([string]$Path, [byte[]]$Key) { $all=[System.IO.File]::ReadAllBytes($Path); $h=[System.Security.Cryptography.HMACSHA256]::new($Key); try { $h.ComputeHash($all, 0, $all.Length - 32) } finally { $h.Dispose() } }
function Unprotect-Archive([string]$Path) {
    $bytes=[System.IO.File]::ReadAllBytes($Path); if($bytes.Length -lt 48){throw 'Encrypted snapshot archive is truncated.'}; $key=Get-Key; $iv=$bytes[0..15]; $expected=$bytes[($bytes.Length-32)..($bytes.Length-1)]; $actual=Get-Hmac $Path $key
    $same=$true; for($i=0;$i -lt $expected.Length;$i++){if($expected[$i] -ne $actual[$i]){$same=$false}}; if(-not $same){throw 'Encrypted snapshot archive integrity validation failed.'}
    $plain=Join-Path $snapshotPath ("restore-decrypted.{0}.tar" -f ([guid]::NewGuid().ToString('N'))); $out=[System.IO.File]::Create($plain); $aes=[System.Security.Cryptography.Aes]::Create(); $aes.Key=$key; $aes.IV=$iv; $aes.Mode='CBC'; $aes.Padding='PKCS7'
    try{$crypto=[System.Security.Cryptography.CryptoStream]::new($out,$aes.CreateDecryptor(),[System.Security.Cryptography.CryptoStreamMode]::Write); try{$crypto.Write($bytes,16,$bytes.Length-48);$crypto.FlushFinalBlock()}finally{$crypto.Dispose()}}finally{$aes.Dispose();$out.Dispose()}; return $plain
}

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
    $plainPath = Unprotect-Archive $Path
    $plainItem = Get-Item -LiteralPath $plainPath
    $plainDigest = (Get-FileHash -LiteralPath $plainPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $encryptedItem = Get-Item -LiteralPath $Path
    $encryptedDigest = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    try { $entries = @(& (Get-TarExecutable) -tf $plainPath 2>&1) } finally { if (Test-Path -LiteralPath $plainPath) { Remove-Item -LiteralPath $plainPath -Force } }
    if ($LASTEXITCODE -ne 0 -or $entries.Count -eq 0) { throw "Snapshot archive could not be reopened: $Path" }
    foreach ($entry in $entries) {
        $text = ([string]$entry).Trim()
        if ($text -match '(^/|^[A-Za-z]:|(^|/)\.\.(?:/|$))') { throw "Snapshot archive contains an unsafe path: $text" }
    }
    if ([long]$plainItem.Length -ne [long]$Expected.bytes -or $plainDigest -ne [string]$Expected.sha256 -or $Expected.encryptedBytes -and [long]$encryptedItem.Length -ne [long]$Expected.encryptedBytes -or $Expected.encryptedSha256 -and $encryptedDigest -ne [string]$Expected.encryptedSha256) { throw "Snapshot archive integrity changed for $($Expected.volume)." }
}

foreach ($archive in @($record.archives)) { Validate-Archive (Join-Path $snapshotPath $archive.archive) $archive }
if (-not $Execute) {
    Write-Host "Plan only. Restore command is: powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\restore-volume-snapshots.ps1`" -SnapshotDirectory `"$snapshotPath`" -ImageRef `"$ImageRef`" -Execute"
    exit 0
}

$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
if ($manifest.image -ne $ImageRef -or $manifest.volumeSchemaVersion -ne $record.volumeSchemaVersion -or $manifest.mountProfile -ne $record.mountProfile) { throw 'Restore image is not the snapshot source or a manifest-declared compatible image.' }
if ($manifest.preflightEvidencePath -ne $PreflightEvidencePath -or (Get-FileHash -LiteralPath $PreflightEvidencePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.preflightEvidenceSha256) { throw 'Restore preflight evidence does not match the external deployment manifest.' }
$evidence = Get-Content -Raw -LiteralPath $PreflightEvidencePath | ConvertFrom-Json
if ([DateTimeOffset]::Parse([string]$evidence.expiresAt) -le [DateTimeOffset]::UtcNow -or @($evidence.checks | Where-Object { -not $_.ok }).Count -gt 0) { throw 'Restore requires fresh successful preflight evidence.' }
$existingId = (& docker compose --project-name $ProjectName --file $ComposeFile ps -q control-plane 2>$null).Trim()
if ($existingId) {
    if ($existingId -notmatch '^[0-9a-f]{12,64}$') { throw 'The existing restore project container id is invalid.' }
    $project = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.project"}}' $existingId).Trim()
    $service = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.service"}}' $existingId).Trim()
    $state = (& docker inspect --format '{{.State.Status}}' $existingId).Trim()
    if ($project -ne 'ding-pbx' -or $service -ne 'control-plane' -or $state -eq 'running') { throw 'Standalone restore requires the exact owned project container to be stopped.' }
}
foreach ($volume in @($record.volumes)) {
    $volumeRecord = (& docker volume inspect $volume 2>$null | ConvertFrom-Json)
    if (-not $volumeRecord -or $volumeRecord[0].Labels.'io.ding.pbx.project' -ne 'ding-pbx') { throw "Volume $volume is not an exact owned deployment volume." }
}
$restoreJournalPath = Join-Path $snapshotPath 'standalone-restore-journal.json'
$restoreJournal = [ordered]@{ schemaVersion = 1; transactionId = ([guid]::NewGuid().ToString('N')); state = 'started'; snapshotId = $record.snapshotId; volumeResults = @(); startedAt = [DateTimeOffset]::UtcNow.ToString('o') }
[System.IO.File]::WriteAllText($restoreJournalPath, ($restoreJournal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))

foreach ($archive in @($record.archives)) {
    $plainPath = Unprotect-Archive (Join-Path $snapshotPath $archive.archive)
    $helperName = "ding-pbx-restore-$([guid]::NewGuid().ToString('N'))"
    $helperId = $null
    try {
        $helperId = (& docker run --detach --name $helperName --label "io.ding.pbx.snapshot-restore=$($record.snapshotId)" --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 256m --cpus 0.50 --tmpfs /tmp:rw,noexec,nosuid,size=8m --user 10001:10001 --entrypoint /bin/tar -v "$($archive.volume):/restore:rw" -v "${plainPath}:/backup/archive.tar:ro" $ImageRef -xf /backup/archive.tar -C /restore).Trim()
        if ($LASTEXITCODE -ne 0 -or $helperId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start restore helper for $($archive.volume)." }
        $deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
        do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $helperId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw "Restore helper timed out for $($archive.volume)." } } while ($state -eq 'running')
        $exitCode = (& docker inspect --format '{{.State.ExitCode}}' $helperId 2>$null).Trim()
        if ($exitCode -ne '0') { throw "Restore helper failed for $($archive.volume)." }
    } finally {
        if ($helperId -and $helperId -match '^[0-9a-f]{12,64}$') { $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-restore"}}' $helperId 2>$null).Trim(); if ($owned -eq [string]$record.snapshotId) { & docker rm --force $helperId | Out-Null } }
        if (Test-Path -LiteralPath $plainPath) { Remove-Item -LiteralPath $plainPath -Force }
    }
    $restoreJournal.volumeResults += [ordered]@{ volume = $archive.volume; archive = $archive.archive; state = 'complete' }
    [System.IO.File]::WriteAllText($restoreJournalPath, ($restoreJournal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
}
Write-Host "Restored five persistent volumes from snapshot $($record.snapshotId)."
& docker compose --project-name $ProjectName --file $ComposeFile up --detach --no-build | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Standalone restore could not restart the owned Compose project.' }
$restoredId = (& docker compose --project-name $ProjectName --file $ComposeFile ps -q control-plane 2>$null).Trim()
if ($restoredId -notmatch '^[0-9a-f]{12,64}$') { throw 'Standalone restore restart verification did not find the owned container.' }
$deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
do { Start-Sleep -Seconds 2; $health = (& docker inspect --format '{{.State.Health.Status}}' $restoredId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw 'Standalone restore restart verification timed out.' } } while ($health -eq 'starting')
if ($health -ne 'healthy') { throw "Standalone restore restart verification found health state $health." }
$restoreJournal.state = 'complete'; $restoreJournal.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
[System.IO.File]::WriteAllText($restoreJournalPath, ($restoreJournal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
