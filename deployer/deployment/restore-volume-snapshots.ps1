[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$SnapshotDirectory,
    [string]$ImageRef = '',
    [string]$ManifestPath = '',
    [string]$PreflightEvidencePath = '',
    [string]$SnapshotEncryptionKeyFile = '',
    [string]$TlsCertificateSha256 = '',
    [string]$TlsCertFile = '',
    [string]$TlsKeyFile = '',
    [string]$SessionCookieFile = '',
    [string]$ComposeFile = "$PSScriptRoot\docker-compose.yml",
    [int]$AdminPort = 8088,
    [string]$BindAddress = '127.0.0.1',
    [string]$ProjectName = 'ding-pbx-control-plane',
    [int]$OperationTimeoutMinutes = 30,
    [int]$SessionCredentialMaxAgeMinutes = 15,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'provenance.ps1')
$operationDeadline = [DateTimeOffset]::UtcNow.AddMinutes($OperationTimeoutMinutes)
function Assert-OperationDeadline { if ($OperationTimeoutMinutes -lt 1 -or [DateTimeOffset]::UtcNow -gt $operationDeadline) { throw 'Restore operation exceeded its bounded deadline.' } }
$MaxEncryptedArchiveBytes = 4GB
$MaxPlainArchiveBytes = 4GB
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path

function Assert-ProtectedExternalPath([string]$Path, [string]$Kind) {
    if ([string]::IsNullOrWhiteSpace($Path) -or -not [System.IO.Path]::IsPathRooted($Path)) { throw "$Kind path must be absolute and outside the repository." }
    $full = [System.IO.Path]::GetFullPath($Path)
    $rootWithSeparator = $repoRoot.TrimEnd('\') + '\'
    if ($full.StartsWith($rootWithSeparator, [StringComparison]::OrdinalIgnoreCase) -or $full.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "$Kind path must be outside the repository." }
    $cursor = $full
    while ($cursor -and $cursor -ne [System.IO.Path]::GetPathRoot($cursor)) {
        if (Test-Path -LiteralPath $cursor) { if ((Get-Item -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "$Kind path cannot traverse a link or reparse point." } }
        $cursor = [System.IO.Path]::GetDirectoryName($cursor)
    }
    return $full
}
function Assert-ProtectedRegularFile([string]$Path, [string]$Kind, [long]$MaxBytes = 1048576) {
    $full = Assert-ProtectedExternalPath $Path $Kind
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw "$Kind must be an existing regular file." }
    $item = Get-Item -LiteralPath $full
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint -or $item.Length -lt 1 -or $item.Length -gt $MaxBytes) { throw "$Kind is not a bounded regular file." }
    $acl = Get-Acl -LiteralPath $full
    if ([string]::IsNullOrWhiteSpace([string]$acl.Owner) -or @($acl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw "$Kind is not protected by an owner-only ACL." }
    return $full
}

$snapshotPath = Assert-ProtectedExternalPath $SnapshotDirectory 'Snapshot directory'
if (-not [System.IO.Path]::IsPathRooted($SnapshotDirectory)) { throw 'SnapshotDirectory must be an absolute path.' }
if (-not (Test-Path -LiteralPath $snapshotPath -PathType Container)) { throw 'SnapshotDirectory must be an existing protected directory.' }
$snapshotAcl = Get-Acl -LiteralPath $snapshotPath
if ([string]::IsNullOrWhiteSpace([string]$snapshotAcl.Owner) -or @($snapshotAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'SnapshotDirectory is not protected by an owner-only ACL.' }
$recordPath = Join-Path $snapshotPath 'snapshot-record.json'
if (-not (Test-Path -LiteralPath $recordPath -PathType Leaf)) { throw 'Snapshot record is missing.' }
$record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
$ExpectedPersistentVolumes = @('ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool')
$ExpectedPersistentVolumeLabels = @('control-plane-data', 'asterisk-etc', 'asterisk-lib', 'asterisk-log', 'asterisk-spool')
function Get-ExpectedPersistentVolumeInventory { return @($ExpectedPersistentVolumes | ForEach-Object -Begin { $index = 0 } -Process { $entry = [ordered]@{ volume = $_; projectLabel = 'ding-pbx'; volumeLabel = $ExpectedPersistentVolumeLabels[$index] }; $index++; [pscustomobject]$entry }) }
function Test-ExactPersistentVolumeInventory($Inventory) { $expected = @(Get-ExpectedPersistentVolumeInventory); $actual = @($Inventory); if ($actual.Count -ne $expected.Count) { return $false }; for ($index = 0; $index -lt $expected.Count; $index++) { if ([string]$actual[$index].volume -ne $expected[$index].volume -or [string]$actual[$index].projectLabel -ne $expected[$index].projectLabel -or [string]$actual[$index].volumeLabel -ne $expected[$index].volumeLabel) { return $false } }; return $true }
function Assert-OwnedSnapshotArchivePath([string]$ArchiveLeaf, [string]$Volume) { $canonicalLeaf = ($Volume.Replace('-', '_') + '.tar.enc'); if ([string]::IsNullOrWhiteSpace($ArchiveLeaf) -or $ArchiveLeaf -ne $canonicalLeaf -or $ArchiveLeaf -ne [IO.Path]::GetFileName($ArchiveLeaf)) { throw 'Snapshot archive must use its canonical archive leaf name.' }; $root = [IO.Path]::GetFullPath($snapshotPath).TrimEnd('\\') + '\\'; $full = [IO.Path]::GetFullPath((Join-Path $snapshotPath $ArchiveLeaf)); if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw 'Snapshot archive path escapes the owned snapshot directory.' }; $cursor = $full; while ($cursor -and $cursor -ne [IO.Path]::GetPathRoot($cursor)) { if (Test-Path -LiteralPath $cursor) { $item = Get-Item -LiteralPath $cursor; if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Snapshot archive path cannot traverse a reparse point.' } }; $cursor = [IO.Path]::GetDirectoryName($cursor) }; if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw 'Snapshot archive must be an existing regular file.' }; $item = Get-Item -LiteralPath $full; if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.Length -lt 84 -or $item.Length -gt $MaxEncryptedArchiveBytes) { throw 'Snapshot archive is not a bounded regular file.' }; return $full }
if ($record.schemaVersion -ne 1 -or $record.snapshotKeyId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$' -or $record.volumeSchemaVersion -ne 1 -or $record.mountProfile -ne 'five-volumes-plus-run-tmpfs' -or (@($record.volumes) -join '|') -ne ($ExpectedPersistentVolumes -join '|') -or (@($record.archives | ForEach-Object { $_.volume }) -join '|') -ne ($ExpectedPersistentVolumes -join '|') -or -not (Test-ExactPersistentVolumeInventory $record.persistentVolumeInventory)) { throw 'Snapshot record is incomplete or incompatible with the exact ordered five-volume deployment contract.' }
if ([string]::IsNullOrWhiteSpace($ImageRef)) { $ImageRef = [string]$record.sourceImage }
if ($ImageRef -notmatch '@sha256:[0-9a-f]{64}$') { throw 'ImageRef must be an immutable image@sha256 reference.' }
if ($Execute -and ([string]::IsNullOrWhiteSpace($ManifestPath) -or [string]::IsNullOrWhiteSpace($PreflightEvidencePath) -or [string]::IsNullOrWhiteSpace($SnapshotEncryptionKeyFile) -or $TlsCertificateSha256 -notmatch '^[0-9a-fA-F]{64}$' -or [string]::IsNullOrWhiteSpace($SessionCookieFile))) { throw 'Execute requires the compatible manifest, fresh preflight evidence, protected encryption key, TLS pin, and readiness credential.' }
if ($Execute -and ([string]::IsNullOrWhiteSpace($TlsCertFile) -or [string]::IsNullOrWhiteSpace($TlsKeyFile))) { throw 'Execute requires protected TLS certificate and private key paths.' }
if ([string]::IsNullOrWhiteSpace($SnapshotEncryptionKeyFile)) { throw 'SnapshotEncryptionKeyFile is required to validate encrypted snapshot archives.' }
if ($Execute) {
    Recover-PlaintextPaths
    $ManifestPath = Assert-ProtectedRegularFile $ManifestPath 'Manifest' 10485760
    $PreflightEvidencePath = Assert-ProtectedRegularFile $PreflightEvidencePath 'Preflight evidence' 10485760
    $SnapshotEncryptionKeyFile = Assert-ProtectedRegularFile $SnapshotEncryptionKeyFile 'Snapshot encryption key' 128
    $SessionCookieFile = Assert-ProtectedRegularFile $SessionCookieFile 'Session credential' 1024
    $TlsCertFile = Assert-ProtectedRegularFile $TlsCertFile 'TLS certificate' 1048576
    $TlsKeyFile = Assert-ProtectedRegularFile $TlsKeyFile 'TLS private key' 1048576
    $keyItem = Get-Item -LiteralPath $SnapshotEncryptionKeyFile
    if ($keyItem.Length -lt 16 -or $keyItem.Length -gt 128) { throw 'Snapshot encryption key file must contain between 16 and 128 bytes.' }
    $keyAcl = Get-Acl -LiteralPath $SnapshotEncryptionKeyFile
    if (@($keyAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'Snapshot encryption key file is readable by a broad group.' }
    $sessionAcl = Get-Acl -LiteralPath $SessionCookieFile
    if (@($sessionAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'Readiness credential file is readable by a broad group.' }
    foreach ($tlsPath in @($TlsCertFile, $TlsKeyFile)) { if (-not [System.IO.Path]::IsPathRooted($tlsPath) -or [System.IO.Path]::GetFullPath($tlsPath).StartsWith($repoRoot.TrimEnd('\') + '\') -or -not (Test-Path -LiteralPath $tlsPath -PathType Leaf)) { throw 'TLS material must be existing absolute paths outside the repository.' }; if ((Get-Item -LiteralPath $tlsPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'TLS material cannot be a reparse point.' } }
    $tlsKeyAcl = Get-Acl -LiteralPath $TlsKeyFile; if (@($tlsKeyAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'TLS private key is readable by a broad group.' }
}

function Get-Keys { $master=[System.IO.File]::ReadAllBytes($SnapshotEncryptionKeyFile); $salt=[Text.Encoding]::UTF8.GetBytes('ding-pbx-snapshot-hkdf-v1'); $extract=[Security.Cryptography.HMACSHA256]::new($salt); try{$prk=$extract.ComputeHash($master)}finally{$extract.Dispose()}; function Expand([byte[]]$prk,[byte[]]$info,[int]$length){$result=New-Object byte[] $length;$previous=[byte[]]::new(0);$offset=0;[byte]$counter=1;while($offset -lt $length){$input=New-Object byte[] ($previous.Length+$info.Length+1);[Buffer]::BlockCopy($previous,0,$input,0,$previous.Length);[Buffer]::BlockCopy($info,0,$input,$previous.Length,$info.Length);$input[$input.Length-1]=$counter;$h=[Security.Cryptography.HMACSHA256]::new($prk);try{$previous=$h.ComputeHash($input)}finally{$h.Dispose()};$copy=[Math]::Min($previous.Length,$length-$offset);[Buffer]::BlockCopy($previous,0,$result,$offset,$copy);$offset+=$copy;$counter++};return $result};$enc=Expand $prk ([Text.Encoding]::UTF8.GetBytes('encryption-v1')) 32;$mac=Expand $prk ([Text.Encoding]::UTF8.GetBytes('integrity-v1')) 32;return [pscustomobject]@{ encryption=$enc; integrity=$mac; formatVersion=2; keyDerivation='HKDF-SHA256'; algorithm='AES-256-CBC+HMAC-SHA256' } }
function Get-Hmac([string]$Path, [byte[]]$Key) { $stream=[System.IO.File]::OpenRead($Path); $h=[System.Security.Cryptography.HMACSHA256]::new($Key); $remaining=$stream.Length-32; $buffer=New-Object byte[] 1048576; try { while($remaining -gt 0){$read=$stream.Read($buffer,0,[int][Math]::Min($buffer.Length,$remaining)); if($read -le 0){throw 'Encrypted snapshot archive ended before its integrity trailer.'};$h.TransformBlock($buffer,0,$read,$buffer,0)|Out-Null;$remaining-=$read};$h.TransformFinalBlock([byte[]]::new(0),0,0)|Out-Null;return $h.Hash } finally {$stream.Dispose();$h.Dispose()} }
function Read-Exact($Stream, [byte[]]$Buffer) { $offset=0; while($offset -lt $Buffer.Length){$read=$Stream.Read($Buffer,$offset,$Buffer.Length-$offset);if($read -le 0){throw 'Encrypted snapshot archive ended before the required bytes.'};$offset+=$read} }
function Test-ConstantTimeEqual([byte[]]$Left, [byte[]]$Right) { if($Left.Length -ne $Right.Length){return $false};$difference=0;for($i=0;$i -lt $Left.Length;$i++){$difference=$difference -bor ($Left[$i]-bxor $Right[$i])};return $difference -eq 0 }
function Read-ArchiveHeader([string]$Path, [string]$ExpectedSnapshotId = '', [string]$ExpectedVolume = '', [string]$ExpectedKeyId = '') {
    $stream=[IO.File]::OpenRead($Path)
    try { $lengthBytes=New-Object byte[] 4; Read-Exact $stream $lengthBytes; $headerLength=[BitConverter]::ToInt32($lengthBytes,0); if($headerLength -lt 32 -or $headerLength -gt 512){throw 'Encrypted snapshot archive header length is invalid.'}; $headerBytes=New-Object byte[] $headerLength; Read-Exact $stream $headerBytes; $parts=([Text.Encoding]::UTF8.GetString($headerBytes)-split '\|',7); if($parts.Count -ne 7 -or $parts[0] -ne 'DING-PBX-SNAPSHOT' -or $parts[1] -ne '2' -or $parts[2] -ne 'HKDF-SHA256' -or $parts[3] -ne 'AES-256-CBC+HMAC-SHA256' -or $parts[4] -notmatch '^[0-9a-f]{32}$' -or $parts[5] -notmatch '^[a-z0-9-]+$' -or $parts[6] -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$'){throw 'Encrypted snapshot archive header is invalid.'}; if(($ExpectedSnapshotId -and $parts[4] -ne $ExpectedSnapshotId)-or($ExpectedVolume -and $parts[5] -ne $ExpectedVolume)-or($ExpectedKeyId -and $parts[6] -ne $ExpectedKeyId)){throw 'Encrypted snapshot archive header does not match the expected snapshot journal identity.'}; return [pscustomobject]@{headerLength=$headerLength;magic=$parts[0];formatVersion=[int]$parts[1];keyDerivation=$parts[2];algorithm=$parts[3];snapshotId=$parts[4];volume=$parts[5];keyId=$parts[6];dataOffset=4+$headerLength} } finally {$stream.Dispose()}
}
function Unprotect-Archive([string]$Path, [string]$ExpectedSnapshotId = '', [string]$ExpectedVolume = '', [string]$ExpectedKeyId = '') {
    $item=Get-Item -LiteralPath $Path; if($item.Length -lt 84 -or $item.Length -gt $MaxEncryptedArchiveBytes){throw 'Encrypted snapshot archive is outside the size bound.'}; $keys=Get-Keys; $header=Read-ArchiveHeader $Path $ExpectedSnapshotId $ExpectedVolume $ExpectedKeyId; $stream=[System.IO.File]::OpenRead($Path); $iv=New-Object byte[] 16; try{$stream.Seek($header.dataOffset,[IO.SeekOrigin]::Begin)|Out-Null;Read-Exact $stream $iv}finally{$stream.Dispose()}; $expected=New-Object byte[] 32; $stream=[System.IO.File]::OpenRead($Path); try{$stream.Seek(-32,[IO.SeekOrigin]::End)|Out-Null;Read-Exact $stream $expected}finally{$stream.Dispose()};$actual=Get-Hmac $Path $keys.integrity; if(-not (Test-ConstantTimeEqual $expected $actual)){throw 'Encrypted snapshot archive integrity validation failed.'}
    $plain=Join-Path $snapshotPath ("restore-decrypted.{0}.tar" -f ([guid]::NewGuid().ToString('N'))); Register-PlaintextPath $plain 'planned'; $out=[System.IO.File]::Create($plain); Register-PlaintextPath $plain 'created'; $aes=[System.Security.Cryptography.Aes]::Create(); $aes.Key=$keys.encryption; $aes.IV=$iv; $aes.Mode='CBC'; $aes.Padding='PKCS7'; $input=[System.IO.File]::OpenRead($Path)
    try{$input.Seek($header.dataOffset + 16,[IO.SeekOrigin]::Begin)|Out-Null;$crypto=[System.Security.Cryptography.CryptoStream]::new($out,$aes.CreateDecryptor(),[System.Security.Cryptography.CryptoStreamMode]::Write); try{$remaining=$input.Length-$header.dataOffset-16-32;$buffer=New-Object byte[] 1048576;while($remaining -gt 0){$read=$input.Read($buffer,0,[int][Math]::Min($buffer.Length,$remaining));if($read -le 0){throw 'Encrypted snapshot archive ended before ciphertext completed.'};$crypto.Write($buffer,0,$read);$remaining-=$read};$crypto.FlushFinalBlock()}finally{$crypto.Dispose()}}catch{if(Test-Path -LiteralPath $plain){Remove-Item -LiteralPath $plain -Force};throw}finally{$input.Dispose();$aes.Dispose();$out.Dispose()};if((Get-Item -LiteralPath $plain).Length -gt $MaxPlainArchiveBytes){Remove-Item -LiteralPath $plain -Force;throw 'Decrypted snapshot archive exceeds the size bound.'};return $plain
}
function Assert-ReadinessCredential {
    $item = Get-Item -LiteralPath $SessionCookieFile
    if ($SessionCredentialMaxAgeMinutes -lt 1 -or $item.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddMinutes(-$SessionCredentialMaxAgeMinutes)) { throw "Readiness credential file is older than the $SessionCredentialMaxAgeMinutes minute freshness bound." }
    $cookie = [System.IO.File]::ReadAllText($SessionCookieFile)
    if ($cookie -match '[\r\n]' -or $cookie -notmatch '^ding_session=[A-Za-z0-9._~-]{16,512}$') { throw 'Readiness credential must contain exactly one server-issued session cookie.' }
    return $cookie
}
function Register-PlaintextPath([string]$Path, [string]$State) { $journalPath=Join-Path $snapshotPath 'plaintext-recovery-journal.json';$journal=if(Test-Path -LiteralPath $journalPath){Get-Content -Raw -LiteralPath $journalPath|ConvertFrom-Json}else{[pscustomobject]@{schemaVersion=1;paths=@()}};$journal.paths=@($journal.paths|Where-Object path -ne $Path)+@([pscustomobject]@{path=$Path;state=$State;recordedAt=[DateTimeOffset]::UtcNow.ToString('o')});$tmp="$journalPath.$([guid]::NewGuid().ToString('N')).tmp";[IO.File]::WriteAllText($tmp,($journal|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false));Move-Item -LiteralPath $tmp -Destination $journalPath -Force }
function Recover-PlaintextPaths { $journalPath=Join-Path $snapshotPath 'plaintext-recovery-journal.json';if(-not(Test-Path -LiteralPath $journalPath)){return};$journal=Get-Content -Raw -LiteralPath $journalPath|ConvertFrom-Json;$root=[System.IO.Path]::GetFullPath($snapshotPath).TrimEnd('\')+'\';foreach($entry in @($journal.paths|Where-Object state -in @('planned','created'))){$full=[System.IO.Path]::GetFullPath([string]$entry.path);if(-not $full.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)-or [System.IO.Path]::GetFileName($full)-notmatch '^(?:snapshot|restore)-decrypted\.[0-9a-f-]+\.tar$'){throw "Plaintext recovery path is outside the owned snapshot pattern: $($entry.path)"};if(Test-Path -LiteralPath $full -PathType Leaf){$item=Get-Item -LiteralPath $full;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Plaintext recovery path is a reparse point: $full"};Remove-Item -LiteralPath $full -Force};Register-PlaintextPath $full 'erased'}}
function Invoke-AuthenticatedReadiness {
    $cookie = Assert-ReadinessCredential
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.ServerCertificateCustomValidationCallback = { param($request, $certificate, $chain, $errors); if ($null -eq $certificate) { return $false }; $actual = ([BitConverter]::ToString($certificate.GetCertHash([Security.Cryptography.HashAlgorithmName]::SHA256))).Replace('-', '').ToLowerInvariant(); return $actual -eq $TlsCertificateSha256.ToLowerInvariant() }
    $client = [System.Net.Http.HttpClient]::new($handler); $client.Timeout = [TimeSpan]::FromSeconds(5)
    $probeAddress = if ($BindAddress -in @('0.0.0.0', '::', '[::]', '*')) { '127.0.0.1' } else { $BindAddress }
    try { $client.DefaultRequestHeaders.Add('Cookie', $cookie); $response = $client.GetAsync("https://$probeAddress`:$AdminPort/api/v1/ready").GetAwaiter().GetResult(); $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json; if (-not $response.IsSuccessStatusCode -or $body.status -ne 'ready' -or [string]$body.asteriskVersion -notmatch '^[0-9]+\.[0-9]+') { throw 'Standalone restore readiness verification failed.' } } finally { $client.Dispose(); $handler.Dispose() }
}

function Assert-ExactOwnedPersistentVolumes {
    for ($index = 0; $index -lt $ExpectedPersistentVolumes.Count; $index++) {
        $volume = $ExpectedPersistentVolumes[$index]
        $volumeRecord = @(& docker volume inspect $volume 2>$null | ConvertFrom-Json)
        if ($LASTEXITCODE -ne 0 -or $volumeRecord.Count -ne 1 -or [string]$volumeRecord[0].Name -ne $volume -or $volumeRecord[0].Labels.'io.ding.pbx.project' -ne [string]$record.persistentVolumeInventory[$index].projectLabel -or $volumeRecord[0].Labels.'io.ding.pbx.volume' -ne [string]$record.persistentVolumeInventory[$index].volumeLabel) {
            throw "Volume $volume is not the exact labeled persistent deployment volume."
        }
    }
}

function Assert-RestoredOwnedContainer([string]$ContainerId, [string]$ExpectedImageRef) {
    if ($ContainerId -notmatch '^[0-9a-f]{12,64}$') { throw 'Standalone restore restart verification did not find a valid container id.' }
    $expectedImage = @(& docker image inspect $ExpectedImageRef 2>$null | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0 -or $expectedImage.Count -ne 1 -or [string]$expectedImage[0].Id -notmatch '^sha256:[0-9a-f]{64}$' -or @($expectedImage[0].RepoDigests) -notcontains $ExpectedImageRef) { throw 'Standalone restore cannot bind the manifest-declared immutable image to a local image id.' }
    $container = @(& docker inspect $ContainerId 2>$null | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0 -or $container.Count -ne 1 -or [string]$container[0].Id -ne $ContainerId -or $container[0].Config.Labels.'io.ding.pbx.project' -ne 'ding-pbx' -or $container[0].Config.Labels.'io.ding.pbx.service' -ne 'control-plane' -or [string]$container[0].Config.Image -ne $ExpectedImageRef -or [string]$container[0].Image -ne [string]$expectedImage[0].Id) {
        throw 'Standalone restore restart verification rejected a stale, unowned, or manifest-image-mismatched container.'
    }
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
    $Path = Assert-OwnedSnapshotArchivePath ([string]$Expected.archive) ([string]$Expected.volume)
    $plainPath = Unprotect-Archive $Path $record.snapshotId $Expected.volume $record.snapshotKeyId
    Register-PlaintextPath $plainPath 'created'
    try {
        $plainItem = Get-Item -LiteralPath $plainPath
        if ($plainItem.Length -gt $MaxPlainArchiveBytes) { throw 'Decrypted snapshot archive exceeds the plaintext size bound.' }
        $plainDigest = (Get-FileHash -LiteralPath $plainPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $encryptedItem = Get-Item -LiteralPath $Path
        $encryptedDigest = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
        $entries = @(& (Get-TarExecutable) -tf $plainPath 2>&1)
        if ($LASTEXITCODE -ne 0 -or $entries.Count -eq 0) { throw "Snapshot archive could not be reopened: $Path" }
        foreach ($entry in $entries) {
            Assert-OperationDeadline
            $text = ([string]$entry).Trim()
            if ($text -match '(^/|^[A-Za-z]:|(^|/)\.\.(?:/|$))') { throw "Snapshot archive contains an unsafe path: $text" }
        }
        if ($Expected.formatVersion -ne 2 -or $Expected.keyDerivation -ne 'HKDF-SHA256' -or $Expected.encryption -ne 'AES-256-CBC+HMAC-SHA256' -or $Expected.archiveHeader.magic -ne 'DING-PBX-SNAPSHOT' -or $Expected.archiveHeader.formatVersion -ne 2 -or $Expected.archiveHeader.keyDerivation -ne 'HKDF-SHA256' -or $Expected.archiveHeader.algorithm -ne 'AES-256-CBC+HMAC-SHA256' -or $Expected.archiveHeader.snapshotId -ne $record.snapshotId -or $Expected.archiveHeader.volume -ne $Expected.volume -or $Expected.archiveHeader.keyId -ne $record.snapshotKeyId -or [long]$plainItem.Length -ne [long]$Expected.bytes -or $plainDigest -ne [string]$Expected.sha256 -or $Expected.encryptedBytes -and [long]$encryptedItem.Length -ne [long]$Expected.encryptedBytes -or $Expected.encryptedSha256 -and $encryptedDigest -ne [string]$Expected.encryptedSha256) { throw "Snapshot archive integrity changed for $($Expected.volume)." }
    } finally { if (Test-Path -LiteralPath $plainPath) { Remove-Item -LiteralPath $plainPath -Force }; Register-PlaintextPath $plainPath 'erased' }
}

foreach ($archive in @($record.archives)) { Assert-OperationDeadline; Validate-Archive (Assert-OwnedSnapshotArchivePath ([string]$archive.archive) ([string]$archive.volume)) $archive }
if (-not $Execute) {
    Write-Host "Plan only. Restore command is: powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\restore-volume-snapshots.ps1`" -SnapshotDirectory `"$snapshotPath`" -ImageRef `"$ImageRef`" -ManifestPath `"$ManifestPath`" -PreflightEvidencePath `"$PreflightEvidencePath`" -SnapshotEncryptionKeyFile `"$SnapshotEncryptionKeyFile`" -TlsCertificateSha256 `"$TlsCertificateSha256`" -TlsCertFile `"$TlsCertFile`" -TlsKeyFile `"$TlsKeyFile`" -SessionCookieFile `"$SessionCookieFile`" -BindAddress `"$BindAddress`" -ComposeFile `"$ComposeFile`" -ProjectName `"$ProjectName`" -AdminPort $AdminPort -Execute"
    exit 0
}

$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
Assert-ExternalDeploymentManifest -Manifest $manifest -ManifestPath $ManifestPath -ImageReference $ImageRef -ProjectName $ProjectName -Port $AdminPort | Out-Null
if ($manifest.image -ne $ImageRef -or $manifest.snapshotKeyId -ne $record.snapshotKeyId -or $manifest.projectName -ne $record.projectName -or [int]$manifest.adminPort -ne [int]$record.adminPort -or $manifest.target -ne $record.target -or $manifest.targetHost -ne $record.targetHost -or $manifest.targetUser -ne $record.targetUser -or [int]$manifest.targetSshPort -ne [int]$record.targetSshPort -or $manifest.inventoryPath -ne $record.inventoryPath -or $manifest.sourceCommit -ne $record.sourceCommit -or [int]$manifest.adminPort -ne $AdminPort -or $manifest.volumeSchemaVersion -ne $record.volumeSchemaVersion -or $manifest.mountProfile -ne $record.mountProfile -or $manifest.sourceTreeSha256 -ne $record.sourceTreeSha256 -or $manifest.dockerfileSha256 -ne $record.dockerfileSha256 -or $manifest.consoleLockSha256 -ne $record.consoleLockSha256 -or $manifest.inputManifestSha256 -ne $record.inputManifestSha256 -or $manifest.aptSbomSha256 -ne $record.aptSbomSha256 -or $manifest.ubuntuSnapshot -ne $record.ubuntuSnapshot -or $manifest.runtimeBaseImage -ne $record.runtimeBaseImage -or $manifest.nodeBuildBaseImage -ne $record.nodeBuildBaseImage) { throw 'Restore image is not the snapshot source or a manifest-declared compatible image.' }
if ($manifest.preflightEvidencePath -ne $PreflightEvidencePath -or (Get-FileHash -LiteralPath $PreflightEvidencePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.preflightEvidenceSha256) { throw 'Restore preflight evidence does not match the external deployment manifest.' }
$evidence = Get-Content -Raw -LiteralPath $PreflightEvidencePath | ConvertFrom-Json
if ([DateTimeOffset]::Parse([string]$evidence.expiresAt) -le [DateTimeOffset]::UtcNow -or $evidence.bindAddress -ne $BindAddress -or $evidence.projectName -ne $ProjectName -or [int]$evidence.requiredPort -ne $AdminPort -or $evidence.target -ne $manifest.target -or $evidence.targetHost -ne $manifest.targetHost -or $evidence.targetUser -ne $manifest.targetUser -or [int]$evidence.targetSshPort -ne [int]$manifest.targetSshPort -or $evidence.inventoryPath -ne $manifest.inventoryPath -or @($evidence.checks | Where-Object { -not $_.ok }).Count -gt 0) { throw 'Restore requires fresh successful preflight evidence matching the reviewed target and bind endpoint.' }
$existingId = (& docker compose --project-name $ProjectName --file $ComposeFile ps -q control-plane 2>$null).Trim()
if ($existingId) {
    if ($existingId -notmatch '^[0-9a-f]{12,64}$') { throw 'The existing restore project container id is invalid.' }
    $project = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.project"}}' $existingId).Trim()
    $service = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.service"}}' $existingId).Trim()
    $state = (& docker inspect --format '{{.State.Status}}' $existingId).Trim()
    if ($project -ne 'ding-pbx' -or $service -ne 'control-plane' -or $state -eq 'running') { throw 'Standalone restore requires the exact owned project container to be stopped.' }
}
Assert-ExactOwnedPersistentVolumes
$restoreJournalPath = Join-Path $snapshotPath 'standalone-restore-journal.json'
$restoreJournal = [ordered]@{ schemaVersion = 1; transactionId = ([guid]::NewGuid().ToString('N')); state = 'started'; snapshotId = $record.snapshotId; volumeResults = @(); startedAt = [DateTimeOffset]::UtcNow.ToString('o') }
[System.IO.File]::WriteAllText($restoreJournalPath, ($restoreJournal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))

try { foreach ($archive in @($record.archives)) { Assert-OperationDeadline
    $plainPath = Unprotect-Archive (Assert-OwnedSnapshotArchivePath ([string]$archive.archive) ([string]$archive.volume)) $record.snapshotId $archive.volume $record.snapshotKeyId
    $helperId = $null
    try {
        $helperId = (& docker run --detach --label "io.ding.pbx.snapshot-restore=$($record.snapshotId)" --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 256m --cpus 0.50 --tmpfs /tmp:rw,noexec,nosuid,size=8m --user 10001:10001 --entrypoint /bin/tar -v "$($archive.volume):/restore:rw" -v "${plainPath}:/backup/archive.tar:ro" $ImageRef -xf /backup/archive.tar -C /restore).Trim()
        if ($LASTEXITCODE -ne 0 -or $helperId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start restore helper for $($archive.volume)." }
        $deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
        do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $helperId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw "Restore helper timed out for $($archive.volume)." } } while ($state -eq 'running')
        $exitCode = (& docker inspect --format '{{.State.ExitCode}}' $helperId 2>$null).Trim()
        if ($exitCode -ne '0') { throw "Restore helper failed for $($archive.volume)." }
    } finally {
        if ($helperId -and $helperId -match '^[0-9a-f]{12,64}$') { $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-restore"}}' $helperId 2>$null).Trim(); if ($owned -eq [string]$record.snapshotId) { & docker rm --force $helperId | Out-Null } }
        if (Test-Path -LiteralPath $plainPath) { Remove-Item -LiteralPath $plainPath -Force }
    }
    $restoreJournal.volumeResults += [ordered]@{ volume = $archive.volume; helperId = $helperId; archive = $archive.archive; state = 'complete' }
    [System.IO.File]::WriteAllText($restoreJournalPath, ($restoreJournal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
} } catch {
    $restoreJournal.state = 'failed'; $restoreJournal.failure = $_.Exception.Message
    [System.IO.File]::WriteAllText($restoreJournalPath, ($restoreJournal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
    throw
}
Write-Host "Restored five persistent volumes from snapshot $($record.snapshotId)."
& docker compose --project-name $ProjectName --file $ComposeFile up --detach --no-build | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Standalone restore could not restart the owned Compose project.' }
$restoredId = (& docker compose --project-name $ProjectName --file $ComposeFile ps -q control-plane 2>$null).Trim()
Assert-RestoredOwnedContainer $restoredId $manifest.image
Assert-ExactOwnedPersistentVolumes
$deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
do { Start-Sleep -Seconds 2; $health = (& docker inspect --format '{{.State.Health.Status}}' $restoredId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw 'Standalone restore restart verification timed out.' } } while ($health -eq 'starting')
if ($health -ne 'healthy') { throw "Standalone restore restart verification found health state $health." }
Invoke-AuthenticatedReadiness
$restoreJournal.state = 'complete'; $restoreJournal.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
[System.IO.File]::WriteAllText($restoreJournalPath, ($restoreJournal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
