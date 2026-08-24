[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$ImageRef,
    [Parameter(Mandatory)] [string]$TlsCertFile,
    [Parameter(Mandatory)] [string]$TlsKeyFile,
    [string]$PreviousImageRef = '',
    [Parameter(Mandatory)] [string]$ManifestPath,
    [Parameter(Mandatory)] [string]$PreflightEvidencePath,
    [string]$PreviousManifestPath = '',
    [string]$ComposeFile = "$PSScriptRoot\docker-compose.yml",
    [string]$ProjectName = 'ding-pbx-control-plane',
    [string]$BindAddress = '127.0.0.1',
    [int]$AdminPort = 8088,
    [string]$SessionCookieFile = '',
    [string]$SnapshotDirectory = '',
    [string]$SnapshotEncryptionKeyFile = '',
    [string]$TlsCertificateSha256 = '',
    [long]$MinimumSnapshotFreeBytes = 8589934592,
    [int]$SnapshotRetentionDays = 14,
    [int]$OperationTimeoutMinutes = 30,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'provenance.ps1')
. (Join-Path $PSScriptRoot 'readiness.ps1')
if ($ImageRef -notmatch '@sha256:[0-9a-f]{64}$') { throw 'ImageRef must be an immutable image@sha256 reference.' }
if ($PreviousImageRef -and $PreviousImageRef -notmatch '@sha256:[0-9a-f]{64}$') { throw 'PreviousImageRef must be an immutable image@sha256 reference.' }
if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Compose file does not exist: $ComposeFile" }
if (-not (Test-Path -LiteralPath $TlsCertFile)) { throw "TLS certificate path does not exist: $TlsCertFile" }
if (-not (Test-Path -LiteralPath $TlsKeyFile)) { throw "TLS private key path does not exist: $TlsKeyFile" }
if (-not (Test-Path -LiteralPath $ManifestPath)) { throw "External deployment manifest does not exist: $ManifestPath" }
if (-not (Test-Path -LiteralPath $PreflightEvidencePath)) { throw "Preflight evidence does not exist: $PreflightEvidencePath" }
if ($Execute -and ([string]::IsNullOrWhiteSpace($SessionCookieFile) -or -not (Test-Path -LiteralPath $SessionCookieFile))) { throw 'Execute requires a protected operator session cookie file for authenticated readiness.' }
if ($Execute -and ([string]::IsNullOrWhiteSpace($SnapshotDirectory))) { throw 'Execute requires an external directory for pre-change volume snapshots.' }
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$recoveryTransactionPath = ''
$operationDeadline = [DateTimeOffset]::UtcNow.AddMinutes($OperationTimeoutMinutes)
$MaxEncryptedArchiveBytes = 4GB
$MaxPlainArchiveBytes = 4GB

function Assert-OperationDeadline {
    if ($OperationTimeoutMinutes -lt 1 -or [DateTimeOffset]::UtcNow -gt $operationDeadline) { throw 'Deployment operation exceeded its bounded deadline.' }
}

function Assert-ProtectedExternalPath([string]$Path, [string]$Kind) {
    if ([string]::IsNullOrWhiteSpace($Path)) { throw "$Kind path is required." }
    if (-not [System.IO.Path]::IsPathRooted($Path)) { throw "$Kind path must be absolute and outside the repository." }
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
function Assert-TlsMaterial([string]$CertificatePath, [string]$KeyPath) {
    $cert = Assert-ProtectedExternalPath $CertificatePath 'TLS certificate'
    $key = Assert-ProtectedExternalPath $KeyPath 'TLS private key'
    foreach ($itemPath in @($cert, $key)) { if (-not (Test-Path -LiteralPath $itemPath -PathType Leaf)) { throw "TLS material is missing: $itemPath" }; $item = Get-Item -LiteralPath $itemPath; if ($item.Length -lt 1 -or $item.Length -gt 1024*1024) { throw "TLS material has an invalid size: $itemPath" }; $acl=Get-Acl -LiteralPath $itemPath; if ([string]::IsNullOrWhiteSpace([string]$acl.Owner)) { throw "TLS material has no owner ACL: $itemPath" } }
    $keyAcl=Get-Acl -LiteralPath $key; if (@($keyAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'TLS private key is readable by a broad group.' }
    return [pscustomobject]@{ certificate=$cert; key=$key }
}

function Assert-ProtectedSessionCredentialFile([string]$Path) {
    $full = Assert-ProtectedExternalPath $Path 'Session credential file'
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { throw 'Execute requires an existing session credential file.' }
    $item = Get-Item -LiteralPath $full
    if ($item.Length -lt 1 -or $item.Length -gt 1024) { throw 'Session credential file must be between 1 and 1024 bytes.' }
    $acl = Get-Acl -LiteralPath $full
    if ([string]::IsNullOrWhiteSpace([string]$acl.Owner)) { throw 'Session credential file has no readable owner ACL.' }
    if (@($acl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'Session credential file is readable by a broad group and is not protected.' }
    $value = [System.IO.File]::ReadAllText($full)
    if ($value -match '[\r\n]') { throw 'Session credential file must contain exactly one cookie line with no newline.' }
    if ($value -notmatch '^ding_session=[A-Za-z0-9._~-]{16,512}$') { throw 'Session credential file does not contain exactly one valid short-lived session cookie.' }
    return $full
}

function Assert-ProtectedSnapshotDirectory([string]$Path) {
    $full = Assert-ProtectedExternalPath $Path 'Snapshot directory'
    New-Item -ItemType Directory -Force -Path $full | Out-Null
    $acl = Get-Acl -LiteralPath $full
    if ([string]::IsNullOrWhiteSpace([string]$acl.Owner)) { throw 'Snapshot directory has no readable owner ACL.' }
    if (@($acl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'Snapshot directory is readable by a broad group and is not protected.' }
    $drive = [System.IO.DriveInfo]::new([System.IO.Path]::GetPathRoot($full))
    if ($drive.AvailableFreeSpace -lt $MinimumSnapshotFreeBytes) { throw "Snapshot destination has $($drive.AvailableFreeSpace) free bytes, but $MinimumSnapshotFreeBytes are required." }
    return $full
}

if ($Execute) {
    Assert-TlsMaterial $TlsCertFile $TlsKeyFile | Out-Null
    $SessionCookieFile = Assert-ProtectedSessionCredentialFile $SessionCookieFile
    $SnapshotDirectory = Assert-ProtectedSnapshotDirectory $SnapshotDirectory
    $SnapshotEncryptionKeyFile = Assert-ProtectedExternalPath $SnapshotEncryptionKeyFile 'Snapshot encryption key file'
    if (-not (Test-Path -LiteralPath $SnapshotEncryptionKeyFile -PathType Leaf)) { throw 'Execute requires an external snapshot encryption key file.' }
    $keyItem = Get-Item -LiteralPath $SnapshotEncryptionKeyFile
    if ($keyItem.Length -lt 16 -or $keyItem.Length -gt 128) { throw 'Snapshot encryption key file must contain between 16 and 128 bytes.' }
    $keyAcl = Get-Acl -LiteralPath $SnapshotEncryptionKeyFile
    if (@($keyAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users|^Users$' }).Count -gt 0) { throw 'Snapshot encryption key file is readable by a broad group.' }
    if ($TlsCertificateSha256 -notmatch '^[0-9a-fA-F]{64}$') { throw 'Execute requires a SHA-256 TLS certificate pin.' }
    $TlsCertificateSha256 = $TlsCertificateSha256.ToLowerInvariant()
    Recover-PlaintextPaths
}
$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
Assert-ExternalDeploymentManifest -Manifest $manifest -ManifestPath $ManifestPath -ImageReference $ImageRef -ProjectName $ProjectName -Port $AdminPort | Out-Null
if ($manifest.target -ne 'local-docker') { throw 'Hosted deployment is restricted to the local Docker engine. Approved SSH inventory is read-only preflight evidence only.' }
if ($manifest.preflightEvidencePath -ne $PreflightEvidencePath) { throw 'Preflight evidence path does not match the external deployment manifest.' }
$evidence = Get-Content -Raw -LiteralPath $PreflightEvidencePath | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $PreflightEvidencePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.preflightEvidenceSha256) { throw 'Preflight evidence bytes do not match the external deployment manifest.' }
$observedAt = [DateTimeOffset]::MinValue
$expiresAt = [DateTimeOffset]::MinValue
if (-not [DateTimeOffset]::TryParse([string]$evidence.observedAt, [ref]$observedAt) -or -not [DateTimeOffset]::TryParse([string]$evidence.expiresAt, [ref]$expiresAt) -or $expiresAt -le [DateTimeOffset]::UtcNow -or $observedAt -gt [DateTimeOffset]::UtcNow) { throw 'Preflight evidence timestamp or expiry is invalid.' }
if ([string]$evidence.expiresAt -ne [string]$manifest.preflightExpiresAt) { throw 'Preflight evidence expiry does not match the external deployment manifest.' }
if ($evidence.projectName -ne $ProjectName -or [int]$evidence.requiredPort -ne $AdminPort -or $evidence.bindAddress -ne $BindAddress -or $evidence.target -ne $manifest.target -or $evidence.targetHost -ne $manifest.targetHost -or $evidence.targetUser -ne $manifest.targetUser -or [int]$evidence.targetSshPort -ne [int]$manifest.targetSshPort -or $evidence.inventoryPath -ne $manifest.inventoryPath -or @($evidence.checks | Where-Object { -not $_.ok }).Count -gt 0) { throw 'Preflight evidence does not match the deployment target, identity, bind address, project, port, inventory, or checks.' }
$previousManifest = $null
if ($PreviousImageRef) {
    if ([string]::IsNullOrWhiteSpace($PreviousManifestPath) -or -not (Test-Path -LiteralPath $PreviousManifestPath)) { throw 'A previous image requires its own external deployment manifest.' }
    $previousManifest = Get-Content -Raw -LiteralPath $PreviousManifestPath | ConvertFrom-Json
    Assert-ExternalDeploymentManifest -Manifest $previousManifest -ManifestPath $PreviousManifestPath -ImageReference $PreviousImageRef -ProjectName $ProjectName -Port $AdminPort | Out-Null
    if ($previousManifest.volumeSchemaVersion -ne $manifest.volumeSchemaVersion -or [string]::IsNullOrWhiteSpace([string]$manifest.volumeSchemaVersion)) { throw 'Automatic rollback is blocked because the previous image does not declare the same compatible volume schema.' }
    if ((@($previousManifest.mountInventory) -join '|') -ne (@($manifest.mountInventory) -join '|')) { throw 'Automatic rollback is blocked because the previous image has an incompatible mount inventory.' }
}

function Read-Provenance([string]$Reference, [bool]$InspectEmbedded, $ExpectedManifest) {
    $container = "ding-pbx-deploy-inspect-$([guid]::NewGuid().ToString('N'))"
    $path = $null
    $created = $false
    try {
        $path = Join-Path ([System.IO.Path]::GetTempPath()) "$container.json"
        if ($InspectEmbedded) {
            & docker pull $Reference | Out-Host
            if ($LASTEXITCODE -ne 0) { throw "docker pull exited with $LASTEXITCODE" }
        }
        $labelRevision = (& docker image inspect $Reference --format '{{index .Config.Labels "org.opencontainers.image.revision"}}').Trim()
        $labelVersion = (& docker image inspect $Reference --format '{{index .Config.Labels "org.opencontainers.image.version"}}').Trim()
        $imageId = (& docker image inspect $Reference --format '{{.Id}}').Trim()
        $repoDigests = (& docker image inspect $Reference --format '{{json .RepoDigests}}').Trim() | ConvertFrom-Json
        if ($imageId -notmatch '^sha256:[0-9a-f]{64}$' -or @($repoDigests).Count -eq 0) { throw 'The immutable image inspection did not return a local image id and RepoDigests.' }
        if ($labelRevision -notmatch '^[0-9a-f]{40}$' -or [string]::IsNullOrWhiteSpace($labelVersion)) { throw 'The final image is missing its source revision or version label.' }
        if ($labelRevision -ne $ExpectedManifest.sourceCommit -or $labelVersion -ne $ExpectedManifest.version) { throw 'The image labels do not match the external deployment manifest.' }
        if (-not $InspectEmbedded) { return [pscustomobject]@{ sourceCommit = [string]$ExpectedManifest.sourceCommit; imageVersion = [string]$ExpectedManifest.version; schemaVersion = 0; imageId = $imageId; repoDigests = @($repoDigests); planOnly = $true } }
        & docker create --label io.ding.pbx.inspect=true --name $container $Reference | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "docker create exited with $LASTEXITCODE" }
        $created = $true
        & docker cp "${container}:/opt/ding-pbx-console/provenance.json" $path | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'The image has no embedded provenance.json.' }
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedManifest.provenanceSha256) { throw 'Embedded provenance SHA-256 does not match the external deployment manifest.' }
        $record = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
        Assert-ProvenanceRecord -Record $record -ExpectedCommit $ExpectedManifest.sourceCommit -ExpectedVersion $ExpectedManifest.version -ExpectedSourceTreeSha256 $ExpectedManifest.sourceTreeSha256 -ExpectedDockerfileSha256 $ExpectedManifest.dockerfileSha256 -ExpectedConsoleLockSha256 $ExpectedManifest.consoleLockSha256 -ExpectedInputManifestSha256 $ExpectedManifest.inputManifestSha256 -ExpectedUbuntuSnapshot $ExpectedManifest.ubuntuSnapshot -ExpectedRuntimeBaseImage $ExpectedManifest.runtimeBaseImage -ExpectedNodeBuildBaseImage $ExpectedManifest.nodeBuildBaseImage | Out-Null
        if ($record.aptSbomSha256 -ne $ExpectedManifest.aptSbomSha256) { throw 'Embedded apt SBOM digest does not match the external deployment manifest.' }
        $sbomPath = Join-Path ([System.IO.Path]::GetTempPath()) "$container-sbom.txt"
        try {
            & docker cp "${container}:/opt/ding-pbx-console/sbom-apt.txt" $sbomPath | Out-Null
            if ($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath $sbomPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedManifest.aptSbomSha256) { throw 'The actual embedded apt SBOM bytes do not match the external manifest.' }
        } finally { if (Test-Path -LiteralPath $sbomPath) { Remove-Item -LiteralPath $sbomPath -Force } }
        if ($record.schemaVersion -ne 1 -or $record.sourceCommit -notmatch '^[0-9a-f]{40}$' -or $record.imageVersion -notmatch '^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$') {
            throw 'The embedded provenance has an invalid schema, source commit, or version.'
        }
        if ($labelRevision -ne $record.sourceCommit -or $labelVersion -ne $record.imageVersion) { throw 'The final image labels do not match embedded provenance.' }
        if ($record.sourceCommit -ne $ExpectedManifest.sourceCommit -or $record.imageVersion -ne $ExpectedManifest.version) { throw 'Embedded provenance does not match the external deployment manifest.' }
        return $record
    } finally {
        if ($created) {
            $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.inspect"}}' $container 2>$null).Trim()
            if ($owned -eq 'true') { & docker rm $container | Out-Null }
        }
        if ($path -and (Test-Path -LiteralPath $path)) { Remove-Item -LiteralPath $path -Force }
    }
}

function Set-ComposeEnvironment([string]$Reference, $Record, $ComposeManifest) {
    $env:DING_PBX_IMAGE = $Reference
    $env:DING_PBX_SOURCE_COMMIT = [string]$ComposeManifest.sourceCommit
    $env:DING_PBX_VERSION = [string]$ComposeManifest.version
    $env:DING_PBX_TLS_CERT_FILE = (Resolve-Path -LiteralPath $TlsCertFile).Path
    $env:DING_PBX_TLS_KEY_FILE = (Resolve-Path -LiteralPath $TlsKeyFile).Path
    $env:DING_PBX_BIND_ADDRESS = $BindAddress
    $env:DING_PBX_PORT = [string]$AdminPort
}

function Get-OwnedContainerId {
    $id = (& docker compose --project-name $ProjectName --file $ComposeFile ps -q control-plane 2>$null).Trim()
    if ($id -notmatch '^[0-9a-f]{12,64}$') { throw 'The Compose control-plane container was not found.' }
    $project = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.project"}}' $id).Trim()
    $service = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.service"}}' $id).Trim()
    if ($project -ne 'ding-pbx' -or $service -ne 'control-plane') { throw 'The discovered container is not owned by this deployment contract.' }
    return $id
}

function Wait-Healthy([string]$ContainerId) {
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        Assert-OperationDeadline
        $state = (& docker inspect --format '{{.State.Health.Status}}' $ContainerId 2>$null).Trim()
        if ($state -eq 'healthy') { return $true }
        if ($state -eq 'unhealthy' -or $state -eq 'exited') { return $false }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-TargetReady([string]$ContainerId) {
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        Assert-OperationDeadline
        $output = @(& docker exec $ContainerId asterisk -rx 'core show version' 2>&1)
        $parsed = Parse-AsteriskReadinessText ($output -join "`n")
        if ($LASTEXITCODE -eq 0 -and $parsed.ok) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-HostReachable {
    $probeAddress = if ($BindAddress -in @('0.0.0.0', '::', '[::]', '*')) { '127.0.0.1' } else { $BindAddress }
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        Assert-OperationDeadline
        $client = [System.Net.Sockets.TcpClient]::new()
        try {
            $task = $client.ConnectAsync($probeAddress, $AdminPort)
            if ($task.Wait(1000) -and $client.Connected) { return $true }
        } catch { }
        finally { $client.Dispose() }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-AuthenticatedReady {
    Assert-OperationDeadline
    $cookie = [System.IO.File]::ReadAllText($SessionCookieFile)
    if ($cookie -match '[\r\n]' -or $cookie -notmatch '^ding_session=[A-Za-z0-9._~-]{16,512}$') { throw 'Session credential file does not contain exactly one protected session cookie.' }
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.ServerCertificateCustomValidationCallback = {
        param($request, $certificate, $chain, $errors)
        if ($null -eq $certificate) { return $false }
        $actual = ([System.BitConverter]::ToString($certificate.GetCertHash([System.Security.Cryptography.HashAlgorithmName]::SHA256))).Replace('-', '').ToLowerInvariant()
        return $actual -eq $TlsCertificateSha256
    }
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(5)
    $probeAddress = if ($BindAddress -in @('0.0.0.0', '::', '[::]', '*')) { '127.0.0.1' } else { $BindAddress }
    try {
        $client.DefaultRequestHeaders.Add('Cookie', $cookie)
        $response = $client.GetAsync("https://$probeAddress`:$AdminPort/api/v1/ready").GetAwaiter().GetResult()
        $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        if (-not $response.IsSuccessStatusCode -or $body.status -ne 'ready' -or [string]$body.asteriskVersion -notmatch '^[0-9]+\.[0-9]+(?:\.[0-9]+)?') { return $false }
        return $true
    } finally { $client.Dispose(); $handler.Dispose() }
}

function Get-TarExecutable {
    if ($env:SystemRoot) {
        $windowsTar = Join-Path $env:SystemRoot 'System32\tar.exe'
        if (Test-Path -LiteralPath $windowsTar) { return $windowsTar }
    }
    $command = Get-Command tar.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    throw 'A tar executable is required to reopen and validate volume snapshots.'
}

function Write-SnapshotJournal($Journal) {
    $path = Join-Path $SnapshotDirectory 'snapshot-journal.json'
    $temporary = Join-Path $SnapshotDirectory ("snapshot-journal.{0}.tmp" -f ([guid]::NewGuid().ToString('N')))
    [System.IO.File]::WriteAllText($temporary, ($Journal | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporary -Destination $path -Force
}

function Write-RecoveryTransaction($Transaction) {
    if ([string]::IsNullOrWhiteSpace($recoveryTransactionPath)) { return }
    $temporary = Join-Path $SnapshotDirectory ("recovery-transaction.{0}.tmp" -f ([guid]::NewGuid().ToString('N')))
    [System.IO.File]::WriteAllText($temporary, ($Transaction | ConvertTo-Json -Depth 10), [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $temporary -Destination $recoveryTransactionPath -Force
}
function Register-PlaintextPath([string]$Path, [string]$State) {
    $journalPath = Join-Path $SnapshotDirectory 'plaintext-recovery-journal.json'
    $journal = if (Test-Path -LiteralPath $journalPath) { Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json } else { [pscustomobject]@{ schemaVersion=1; paths=@() } }
    $journal.paths = @($journal.paths | Where-Object path -ne $Path) + @([pscustomobject]@{ path=$Path; state=$State; recordedAt=[DateTimeOffset]::UtcNow.ToString('o') })
    $temporary = "$journalPath.$([guid]::NewGuid().ToString('N')).tmp"; [System.IO.File]::WriteAllText($temporary, ($journal | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false)); Move-Item -LiteralPath $temporary -Destination $journalPath -Force
}
function Recover-PlaintextPaths {
    $journalPath=Join-Path $SnapshotDirectory 'plaintext-recovery-journal.json'; if(-not (Test-Path -LiteralPath $journalPath)){return}; $journal=Get-Content -Raw -LiteralPath $journalPath|ConvertFrom-Json; $root=[System.IO.Path]::GetFullPath($SnapshotDirectory).TrimEnd('\')+'\'; foreach($entry in @($journal.paths|Where-Object state -in @('planned','created'))){ $full=[System.IO.Path]::GetFullPath([string]$entry.path); if(-not $full.StartsWith($root,[StringComparison]::OrdinalIgnoreCase) -or [System.IO.Path]::GetFileName($full) -notmatch '^snapshot-decrypted\.[0-9a-f-]+\.tar$'){throw "Plaintext recovery path is outside the owned snapshot pattern: $($entry.path)"}; if(Test-Path -LiteralPath $full -PathType Leaf){$item=Get-Item -LiteralPath $full;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Plaintext recovery path is a reparse point: $full"};Remove-Item -LiteralPath $full -Force}; Register-PlaintextPath $full 'erased' }
}

function Get-SnapshotEncryptionKeys {
    $bytes = [System.IO.File]::ReadAllBytes($SnapshotEncryptionKeyFile)
    $salt = [System.Text.Encoding]::UTF8.GetBytes('ding-pbx-snapshot-hkdf-v1')
    $extract = [System.Security.Cryptography.HMACSHA256]::new($salt); try { $prk = $extract.ComputeHash($bytes) } finally { $extract.Dispose() }
    function Expand-Hkdf([byte[]]$Prk, [byte[]]$Info, [int]$Length) {
        $result = New-Object byte[] $Length; $previous = [byte[]]::new(0); $offset = 0; [byte]$counter = 1
        while ($offset -lt $Length) {
            $input = New-Object byte[] ($previous.Length + $Info.Length + 1)
            [Buffer]::BlockCopy($previous, 0, $input, 0, $previous.Length); [Buffer]::BlockCopy($Info, 0, $input, $previous.Length, $Info.Length); $input[$input.Length - 1] = $counter
            $h = [System.Security.Cryptography.HMACSHA256]::new($Prk); try { $previous = $h.ComputeHash($input) } finally { $h.Dispose() }
            $copy = [Math]::Min($previous.Length, $Length - $offset); [Buffer]::BlockCopy($previous, 0, $result, $offset, $copy); $offset += $copy; $counter++
        }
        return $result
    }
    $enc = Expand-Hkdf $prk ([Text.Encoding]::UTF8.GetBytes('encryption-v1')) 32
    $mac = Expand-Hkdf $prk ([Text.Encoding]::UTF8.GetBytes('integrity-v1')) 32
    return [pscustomobject]@{ encryption = $enc; integrity = $mac; formatVersion = 1; keyDerivation = 'HKDF-SHA256' }
}

function Get-FileHmacSha256([string]$Path, [byte[]]$Key, [bool]$ExcludeTrailer = $true) {
    $hmac = [System.Security.Cryptography.HMACSHA256]::new($Key)
    $stream = [System.IO.File]::OpenRead($Path)
    $buffer = New-Object byte[] 1048576; $trailer = if($ExcludeTrailer){32}else{0}; $remaining = $stream.Length - $trailer
    try { while ($remaining -gt 0) { $read = $stream.Read($buffer, 0, [int][Math]::Min($buffer.Length, $remaining)); if($read -le 0){throw 'Encrypted snapshot archive ended before its integrity trailer.'}; $hmac.TransformBlock($buffer, 0, $read, $buffer, 0) | Out-Null; $remaining -= $read }; $hmac.TransformFinalBlock([byte[]]::new(0), 0, 0) | Out-Null; return $hmac.Hash } finally { $stream.Dispose(); $hmac.Dispose() }
}
function Get-BytesHmacSha256([byte[]]$Bytes, [int]$Length, [byte[]]$Key) { $hmac = [System.Security.Cryptography.HMACSHA256]::new($Key); try { return $hmac.ComputeHash($Bytes, 0, $Length) } finally { $hmac.Dispose() } }
function Read-Exact($Stream, [byte[]]$Buffer) { $offset=0; while($offset -lt $Buffer.Length){$read=$Stream.Read($Buffer,$offset,$Buffer.Length-$offset);if($read -le 0){throw 'Encrypted snapshot archive ended before the required bytes.'};$offset+=$read} }
function Test-ConstantTimeEqual([byte[]]$Left, [byte[]]$Right) { if($Left.Length -ne $Right.Length){return $false};$difference=0;for($i=0;$i -lt $Left.Length;$i++){$difference=$difference -bor ($Left[$i]-bxor $Right[$i])};return $difference -eq 0 }

function Protect-SnapshotArchive([string]$PlainPath) {
    $keys = Get-SnapshotEncryptionKeys; $key = $keys.encryption
    $encryptedPath = "$PlainPath.enc"
    $iv = New-Object byte[] 16
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($iv); $rng.Dispose()
    $input = [System.IO.File]::OpenRead($PlainPath)
    $output = [System.IO.File]::Create($encryptedPath)
    try {
        $output.Write($iv, 0, $iv.Length)
        $aes = [System.Security.Cryptography.Aes]::Create(); $aes.Key = $key; $aes.IV = $iv; $aes.Mode = 'CBC'; $aes.Padding = 'PKCS7'
        try { $crypto = [System.Security.Cryptography.CryptoStream]::new($output, $aes.CreateEncryptor(), [System.Security.Cryptography.CryptoStreamMode]::Write); try { $input.CopyTo($crypto); $crypto.FlushFinalBlock() } finally { $crypto.Dispose() } } finally { $aes.Dispose() }
    } finally { $input.Dispose(); $output.Dispose() }
    $mac = Get-FileHmacSha256 $encryptedPath $keys.integrity $false
    $append = [System.IO.File]::Open($encryptedPath, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None); try { $append.Write($mac, 0, $mac.Length) } finally { $append.Dispose() }
    $encryptedItem = Get-Item -LiteralPath $encryptedPath
    Remove-Item -LiteralPath $PlainPath -Force
    [pscustomobject]@{ path = $encryptedPath; bytes = [long]$encryptedItem.Length; sha256 = (Get-FileHash -LiteralPath $encryptedPath -Algorithm SHA256).Hash.ToLowerInvariant(); formatVersion = $keys.formatVersion; keyDerivation = $keys.keyDerivation; algorithm = 'AES-256-CBC+HMAC-SHA256' }
}

function Unprotect-SnapshotArchive([string]$EncryptedPath) {
    $keys = Get-SnapshotEncryptionKeys; $item=Get-Item -LiteralPath $EncryptedPath; if($item.Length -lt 48 -or $item.Length -gt $MaxEncryptedArchiveBytes){throw 'Encrypted snapshot archive is outside the size bound.'}; $stream=[System.IO.File]::OpenRead($EncryptedPath);$iv=New-Object byte[] 16;try{Read-Exact $stream $iv}finally{$stream.Dispose()};$expected=New-Object byte[] 32;$stream=[System.IO.File]::OpenRead($EncryptedPath);try{$stream.Seek(-32,[IO.SeekOrigin]::End)|Out-Null;Read-Exact $stream $expected}finally{$stream.Dispose()};$actual=Get-FileHmacSha256 $EncryptedPath $keys.integrity;if(-not (Test-ConstantTimeEqual $expected $actual)){throw 'Encrypted snapshot archive integrity validation failed.'};$temporary=Join-Path $SnapshotDirectory ("snapshot-decrypted.{0}.tar"-f([guid]::NewGuid().ToString('N')));Register-PlaintextPath $temporary 'planned';$output=[System.IO.File]::Create($temporary);Register-PlaintextPath $temporary 'created';$input=[System.IO.File]::OpenRead($EncryptedPath);$aes=[System.Security.Cryptography.Aes]::Create();$aes.Key=$keys.encryption;$aes.IV=$iv;$aes.Mode='CBC';$aes.Padding='PKCS7';try{$input.Seek(16,[IO.SeekOrigin]::Begin)|Out-Null;$crypto=[Security.Cryptography.CryptoStream]::new($output,$aes.CreateDecryptor(),[Security.Cryptography.CryptoStreamMode]::Write);try{$remaining=$input.Length-48;$buffer=New-Object byte[] 1048576;while($remaining -gt 0){$read=$input.Read($buffer,0,[int][Math]::Min($buffer.Length,$remaining));if($read -le 0){throw 'Encrypted snapshot archive ended before ciphertext completed.'};$crypto.Write($buffer,0,$read);$remaining-=$read};$crypto.FlushFinalBlock()}finally{$crypto.Dispose()}}catch{if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Force;Register-PlaintextPath $temporary 'erased'};throw}finally{$input.Dispose();$aes.Dispose();$output.Dispose()};if((Get-Item -LiteralPath $temporary).Length -gt $MaxPlainArchiveBytes){Remove-Item -LiteralPath $temporary -Force;Register-PlaintextPath $temporary 'erased';throw 'Decrypted snapshot archive exceeds the size bound.'};return $temporary
}

function Stop-OwnedServiceForSnapshot($Transaction) {
    $id = (& docker compose --project-name $ProjectName --file $ComposeFile ps -q control-plane 2>$null).Trim()
    if ([string]::IsNullOrWhiteSpace($id)) { $Transaction.serviceState = 'absent'; Write-RecoveryTransaction $Transaction; return $null }
    if ($id -notmatch '^[0-9a-f]{12,64}$') { throw 'The pre-change Compose container id is invalid.' }
    $project = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.project"}}' $id).Trim()
    $service = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.service"}}' $id).Trim()
    if ($project -ne 'ding-pbx' -or $service -ne 'control-plane') { throw 'The pre-change container is not owned by this deployment contract.' }
    $digests = (& docker inspect --format '{{json .RepoDigests}}' $id).Trim() | ConvertFrom-Json
    $image = @($digests | Where-Object { $_ -match '@sha256:[0-9a-f]{64}$' } | Select-Object -First 1)[0]
    if ([string]::IsNullOrWhiteSpace([string]$image)) { throw 'The pre-change owned container has no immutable image digest.' }
    $Transaction.serviceState = 'stopping'; $Transaction.preChangeImage = $image; Write-RecoveryTransaction $Transaction
    & docker compose --project-name $ProjectName --file $ComposeFile stop --timeout 30 control-plane | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'The pre-change owned service could not be stopped before snapshotting.' }
    $Transaction.serviceState = 'stopped'; Write-RecoveryTransaction $Transaction
    return [string]$image
}

function Restore-PartialVolumeSnapshots {
    $journalPath = Join-Path $SnapshotDirectory 'snapshot-journal.json'
    if (-not (Test-Path -LiteralPath $journalPath)) { return }
    $journal = Get-Content -Raw -LiteralPath $journalPath | ConvertFrom-Json
    foreach ($result in @($journal.volumeResults | Where-Object state -eq 'complete')) {
        Assert-OperationDeadline
        $path = Join-Path $SnapshotDirectory $result.archive
        $actual = Read-AndValidateSnapshotTar $path
        if ($actual.bytes -ne [long]$result.bytes -or $actual.sha256 -ne $result.sha256) { throw "Partial snapshot restore is blocked by an archive integrity mismatch for $($result.volume)." }
        $helperName = "ding-pbx-partial-restore-$([guid]::NewGuid().ToString('N'))"
        $plainPath = Unprotect-SnapshotArchive $path
        $helperId = $null
        try {
            $helperId = (& docker run --detach --name $helperName --label io.ding.pbx.snapshot-partial-restore=$journal.snapshotId --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 256m --cpus 0.50 --tmpfs /tmp:rw,noexec,nosuid,size=8m --user 10001:10001 --entrypoint /bin/tar -v "$($result.volume):/restore:rw" -v "${plainPath}:/backup/archive.tar:ro" $preChangeImageRef -xf /backup/archive.tar -C /restore).Trim()
            if ($LASTEXITCODE -ne 0 -or $helperId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start partial snapshot restore for $($result.volume)." }
            $deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
            do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $helperId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw "Partial snapshot restore timed out for $($result.volume)." } } while ($state -eq 'running')
            if ((& docker inspect --format '{{.State.ExitCode}}' $helperId 2>$null).Trim() -ne '0') { throw "Partial snapshot restore failed for $($result.volume)." }
        } finally { if ($helperId -and $helperId -match '^[0-9a-f]{12,64}$') { $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-partial-restore"}}' $helperId 2>$null).Trim(); if ($owned -eq [string]$journal.snapshotId) { & docker rm --force $helperId | Out-Null } }; if (Test-Path -LiteralPath $plainPath) { Remove-Item -LiteralPath $plainPath -Force } }
    }
}

function Read-AndValidateSnapshotTar([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Snapshot archive does not exist: $Path" }
    $temporary = $null
    if ($Path.EndsWith('.enc', [StringComparison]::OrdinalIgnoreCase)) { $temporary = Unprotect-SnapshotArchive $Path; Register-PlaintextPath $temporary 'created'; $Path = $temporary }
    try {
    $tar = Get-TarExecutable
    $entries = @(& $tar -tf $Path 2>&1)
    if ($LASTEXITCODE -ne 0 -or $entries.Count -eq 0) { throw "Snapshot archive could not be reopened: $Path" }
    $safeEntries = @()
    foreach ($entry in $entries) {
        Assert-OperationDeadline
        $text = ([string]$entry).Trim()
        if ([string]::IsNullOrWhiteSpace($text)) { continue }
        $normalized = ($text -replace '^\./', '').TrimEnd('/')
        if ($normalized -match '(^/|^[A-Za-z]:|(^|/)\.\.(?:/|$))') { throw "Snapshot archive contains an unsafe path: $text" }
        $safeEntries += $normalized
    }
    if ($safeEntries.Count -eq 0) { throw "Snapshot archive contains no usable entries: $Path" }
    $item = Get-Item -LiteralPath $Path
    if ($item.Length -gt $MaxPlainArchiveBytes) { throw "Snapshot archive exceeds the plaintext size bound: $Path" }
    [pscustomobject]@{ bytes = [long]$item.Length; sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant(); entries = $safeEntries }
    } finally { if ($temporary -and (Test-Path -LiteralPath $temporary)) { Remove-Item -LiteralPath $temporary -Force }; if ($temporary) { Register-PlaintextPath $temporary 'erased' } }
}

function Snapshot-Volumes {
    $SnapshotDirectory = Assert-ProtectedSnapshotDirectory $SnapshotDirectory
    $snapshotRunId = ([guid]::NewGuid().ToString('N'))
    $volumes = @('ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool')
    $journal = [ordered]@{ schemaVersion = 1; snapshotId = $snapshotRunId; state = 'started'; createdAt = [DateTimeOffset]::UtcNow.ToString('o'); volumeResults = @(); retention = [ordered]@{ keepDays = $SnapshotRetentionDays; cleanup = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\cleanup-volume-snapshots.ps1`" -SnapshotParent `"$([System.IO.Path]::GetDirectoryName($SnapshotDirectory))`" -SnapshotEncryptionKeyFile `"<protected-key-path>`" -TaskManifestPath `"<task-owned-manifest-path>`" -RetentionDays $SnapshotRetentionDays -Execute; remove only complete, recoverability-verified snapshot directories" } }
    Write-SnapshotJournal $journal
    foreach ($volume in $volumes) {
        Assert-OperationDeadline
        $safe = $volume.Replace('-', '_')
        $name = "ding-pbx-snapshot-$snapshotRunId-$safe"
        $destination = Join-Path $SnapshotDirectory "$safe.tar"
        $helperId = $null
        try {
            $helperId = (& docker run --detach --label io.ding.pbx.snapshot=true --label "io.ding.pbx.snapshot-id=$snapshotRunId" --label "io.ding.pbx.snapshot-volume=$volume" --name $name --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 256m --cpus 0.50 --tmpfs /tmp:rw,noexec,nosuid,size=8m --user 10001:10001 --entrypoint /bin/tar -v "${volume}:/source:ro" -v "${SnapshotDirectory}:/backup:rw" $ImageRef -cf "/backup/$safe.tar" -C /source .).Trim()
            if ($LASTEXITCODE -ne 0 -or $helperId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start owned volume snapshot for $volume." }
            $deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
            do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $helperId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw "Volume snapshot helper timed out for $volume." } } while ($state -eq 'running')
            $exitCode = (& docker inspect --format '{{.State.ExitCode}}' $helperId 2>$null).Trim()
            $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot"}}' $helperId 2>$null).Trim()
            $ownedRun = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-id"}}' $helperId 2>$null).Trim()
            if ($owned -ne 'true' -or $ownedRun -ne $snapshotRunId) { throw "Snapshot helper $name is not owned by this exact snapshot run." }
            if ($exitCode -ne '0') { throw "Volume snapshot helper failed for $volume." }
            $archive = Read-AndValidateSnapshotTar $destination
            Register-PlaintextPath $destination 'created'
            $protected = Protect-SnapshotArchive $destination
            Register-PlaintextPath $destination 'erased'
            $journal.volumeResults += [ordered]@{ volume = $volume; helperId = $helperId; archive = [System.IO.Path]::GetFileName($protected.path); bytes = $archive.bytes; sha256 = $archive.sha256; encryptedBytes = $protected.bytes; encryptedSha256 = $protected.sha256; encryption = $protected.algorithm; formatVersion = $protected.formatVersion; keyDerivation = $protected.keyDerivation; entries = $archive.entries; state = 'complete' }
            $journal.state = 'in-progress'
            Write-SnapshotJournal $journal
        } catch {
            $journal.state = 'failed'
            $journal.failure = $_.Exception.Message
            Write-SnapshotJournal $journal
            throw
        } finally {
            if ($helperId -and $helperId -match '^[0-9a-f]{12,64}$') {
                $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot"}}' $helperId 2>$null).Trim()
                if ($owned -eq 'true') { & docker rm --force $helperId | Out-Null }
            }
            $recorded = @($journal.volumeResults | Where-Object volume -eq $volume).Count -gt 0
            if (-not $recorded) {
                if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }
                $partialEncrypted = "$destination.enc"
                if (Test-Path -LiteralPath $partialEncrypted) { Remove-Item -LiteralPath $partialEncrypted -Force }
            }
        }
    }
    $snapshotRecord = [ordered]@{ schemaVersion = 1; snapshotId = $snapshotRunId; sourceImage = $ImageRef; sourceCommit = $manifest.sourceCommit; sourceVersion = $manifest.version; sourceTreeSha256 = $manifest.sourceTreeSha256; dockerfileSha256 = $manifest.dockerfileSha256; consoleLockSha256 = $manifest.consoleLockSha256; inputManifestSha256 = $manifest.inputManifestSha256; aptSbomSha256 = $manifest.aptSbomSha256; ubuntuSnapshot = $manifest.ubuntuSnapshot; runtimeBaseImage = $manifest.runtimeBaseImage; nodeBuildBaseImage = $manifest.nodeBuildBaseImage; volumeSchemaVersion = $manifest.volumeSchemaVersion; mountProfile = $manifest.mountProfile; volumes = $volumes; archives = $journal.volumeResults; createdAt = [DateTimeOffset]::UtcNow.ToString('o'); compatibility = 'restore only into the same volume schema, mount profile, and ordered volume names'; restoreCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\restore-volume-snapshots.ps1`" -SnapshotDirectory `"$SnapshotDirectory`" -ManifestPath `"<compatible-manifest-path>`" -PreflightEvidencePath `"<fresh-preflight-path>`" -SnapshotEncryptionKeyFile `"<protected-key-path>`" -TlsCertificateSha256 `"<certificate-pin>`" -SessionCookieFile `"<fresh-readiness-credential>`" -Execute"; retention = $journal.retention }
    [System.IO.File]::WriteAllText((Join-Path $SnapshotDirectory 'snapshot-record.json'), ($snapshotRecord | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
    $journal.state = 'complete'
    $journal.snapshotRecordSha256 = (Get-FileHash -LiteralPath (Join-Path $SnapshotDirectory 'snapshot-record.json') -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-SnapshotJournal $journal
    Test-SnapshotRecoverability
    $journal.recoverability = 'verified'
    Write-SnapshotJournal $journal
}

function Test-SnapshotRecoverability {
    $recordPath = Join-Path $SnapshotDirectory 'snapshot-record.json'
    $record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
    if ($record.schemaVersion -ne 1 -or $record.volumeSchemaVersion -ne $manifest.volumeSchemaVersion -or @($record.volumes).Count -ne 5 -or @($record.archives).Count -ne 5) { throw 'Snapshot recoverability is blocked by an incomplete or incompatible record.' }
    foreach ($archive in @($record.archives)) {
        Assert-OperationDeadline
        $path = Join-Path $SnapshotDirectory $archive.archive
        $actual = Read-AndValidateSnapshotTar $path
        if ($actual.bytes -ne [long]$archive.bytes -or $actual.sha256 -ne $archive.sha256) { throw "Snapshot archive digest or byte count changed for $($archive.volume)." }
        $volumeName = ("ding-pbx-snapshot-recovery-{0}-{1}" -f $record.snapshotId, ([guid]::NewGuid().ToString('N')))
        $volumeId = (& docker volume create --label io.ding.pbx.snapshot-recovery=$record.snapshotId $volumeName).Trim()
        if ($LASTEXITCODE -ne 0 -or $volumeId -ne $volumeName) { throw "Could not create a temporary recovery volume for $($archive.volume)." }
        try {
            $helperName = "ding-pbx-recover-$([guid]::NewGuid().ToString('N'))"
            $plainPath = Unprotect-SnapshotArchive $path
            $helperId = $null
            try {
                $helperId = (& docker run --detach --name $helperName --label io.ding.pbx.snapshot-recovery=$record.snapshotId --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 256m --cpus 0.50 --tmpfs /tmp:rw,noexec,nosuid,size=8m --user 10001:10001 --entrypoint /bin/tar -v "${volumeId}:/restore:rw" -v "${plainPath}:/backup/archive.tar:ro" $ImageRef -xf /backup/archive.tar -C /restore).Trim()
                if ($LASTEXITCODE -ne 0 -or $helperId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start snapshot recoverability helper for $($archive.volume)." }
                $deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
                do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $helperId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw "Snapshot recovery helper timed out for $($archive.volume)." } } while ($state -eq 'running')
                $exitCode = (& docker inspect --format '{{.State.ExitCode}}' $helperId 2>$null).Trim()
                if ($exitCode -ne '0') { throw "Snapshot recovery extraction failed for $($archive.volume)." }
            } finally { if ($helperId -and $helperId -match '^[0-9a-f]{12,64}$') { $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-recovery"}}' $helperId 2>$null).Trim(); if ($owned -eq [string]$record.snapshotId) { & docker rm --force $helperId | Out-Null } }; if (Test-Path -LiteralPath $plainPath) { Remove-Item -LiteralPath $plainPath -Force } }
        } finally {
            if ($helperId -and $helperId -match '^[0-9a-f]{12,64}$') { $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-recovery"}}' $helperId 2>$null).Trim(); if ($owned -eq [string]$record.snapshotId) { & docker rm --force $helperId | Out-Null } }
            if ($volumeId -eq $volumeName) { & docker volume rm $volumeId | Out-Null }
        }
    }
}

function Restore-VolumeSnapshots([string]$RestoreImageRef = $ImageRef, $RestoreManifest = $manifest) {
    $record = Get-Content -Raw -LiteralPath (Join-Path $SnapshotDirectory 'snapshot-record.json') | ConvertFrom-Json
    if ($record.schemaVersion -ne 1 -or $record.volumeSchemaVersion -ne $RestoreManifest.volumeSchemaVersion -or $record.mountProfile -ne $RestoreManifest.mountProfile -or (@($record.volumes) -join '|') -ne (@($RestoreManifest.mountInventory | Where-Object { $_ -notmatch ':tmpfs$' }) -join '|')) { throw 'Volume restore is blocked because the snapshot is incompatible with the rollback image.' }
    foreach ($archive in @($record.archives)) {
        Assert-OperationDeadline
        $path = Join-Path $SnapshotDirectory $archive.archive
        $actual = Read-AndValidateSnapshotTar $path
        if ($actual.bytes -ne [long]$archive.bytes -or $actual.sha256 -ne $archive.sha256) { throw "Volume restore is blocked because $($archive.volume) failed its archive integrity check." }
        $helperName = "ding-pbx-restore-$([guid]::NewGuid().ToString('N'))"
        $plainPath = Unprotect-SnapshotArchive $path
        $helperId = $null
        try {
            $helperId = (& docker run --detach --name $helperName --label io.ding.pbx.snapshot-restore=$record.snapshotId --network none --read-only --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 256m --cpus 0.50 --tmpfs /tmp:rw,noexec,nosuid,size=8m --user 10001:10001 --entrypoint /bin/tar -v "$($archive.volume):/restore:rw" -v "${plainPath}:/backup/archive.tar:ro" $RestoreImageRef -xf /backup/archive.tar -C /restore).Trim()
            if ($LASTEXITCODE -ne 0 -or $helperId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start volume restore helper for $($archive.volume)." }
            $deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
            do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $helperId 2>$null).Trim(); if ([DateTimeOffset]::UtcNow -gt $deadline) { throw "Volume restore helper timed out for $($archive.volume)." } } while ($state -eq 'running')
            $exitCode = (& docker inspect --format '{{.State.ExitCode}}' $helperId 2>$null).Trim()
            if ($exitCode -ne '0') { throw "Volume restore failed for $($archive.volume)." }
        } finally { if ($helperId -and $helperId -match '^[0-9a-f]{12,64}$') { $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot-restore"}}' $helperId 2>$null).Trim(); if ($owned -eq [string]$record.snapshotId) { & docker rm --force $helperId | Out-Null } }; if (Test-Path -LiteralPath $plainPath) { Remove-Item -LiteralPath $plainPath -Force } }
    }
}

function Assert-OwnedDeployment([string]$ContainerId, [string]$ExpectedImageRef) {
    $digests = (& docker inspect --format '{{json .RepoDigests}}' $ContainerId).Trim() | ConvertFrom-Json
    if (-not (@($digests) | Where-Object { $_ -eq $ExpectedImageRef })) { throw 'Live container does not carry the exact immutable image digest.' }
    $mounts = (& docker inspect --format '{{json .Mounts}}' $ContainerId).Trim() | ConvertFrom-Json
    $requiredVolumes = @('ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool')
    foreach ($volume in $requiredVolumes) {
        if (-not (@($mounts | Where-Object { $_.Name -eq $volume -and $_.Type -eq 'volume' }).Count -eq 1)) { throw "Live container is missing owned volume $volume." }
    }
    $runMount = @($mounts | Where-Object { $_.Destination -eq '/run/asterisk' -and $_.Type -eq 'tmpfs' })
    if ($runMount.Count -ne 1) { throw 'Live container does not have the owned /run/asterisk tmpfs.' }
    $networks = (& docker inspect --format '{{json .NetworkSettings.Networks}}' $ContainerId).Trim() | ConvertFrom-Json
    if (-not $networks.'ding-pbx-control-plane_control-plane') { throw 'Live container is not attached to the internal control-plane network.' }
}

Assert-OperationDeadline
$record = Read-Provenance $ImageRef $Execute $manifest
Assert-OperationDeadline
Set-ComposeEnvironment $ImageRef $record $manifest
Write-Host "Prepared immutable image $ImageRef from source commit $($record.sourceCommit), version $($record.imageVersion)."
if (-not $Execute) {
    Write-Host "Plan-only image inspection: local image id and RepoDigests were checked; embedded provenance, snapshot recoverability, Compose state, and runtime readiness remain unverified."
    Write-Host 'Plan only. No Compose state changed. Re-run with -Execute after reviewing the preflight and provenance.'
    exit 0
}

$snapshotPath = $SnapshotDirectory
$recoveryTransactionPath = Join-Path $SnapshotDirectory 'recovery-transaction.json'
$recoveryTransaction = [ordered]@{ schemaVersion = 1; transactionId = ([guid]::NewGuid().ToString('N')); state = 'started'; serviceState = 'unknown'; snapshotState = 'not-started'; restoreState = 'not-started'; previousStartState = 'not-started'; startedAt = [DateTimeOffset]::UtcNow.ToString('o') }
Write-RecoveryTransaction $recoveryTransaction
try {
    Assert-OperationDeadline
    $preChangeImageRef = Stop-OwnedServiceForSnapshot $recoveryTransaction
    $recoveryTransaction.snapshotState = 'started'; Write-RecoveryTransaction $recoveryTransaction
    Snapshot-Volumes
    Assert-OperationDeadline
    $recoveryTransaction.snapshotState = 'complete'; Write-RecoveryTransaction $recoveryTransaction
} catch {
    $recoveryTransaction.state = 'snapshot-failed'
    $recoveryTransaction.failure = $_.Exception.Message
    try { Restore-PartialVolumeSnapshots; $recoveryTransaction.restoreState = 'partial-complete' } catch { $recoveryTransaction.restoreState = 'failed'; $recoveryTransaction.restoreFailure = $_.Exception.Message }
    if ($preChangeImageRef) {
        try {
            Set-ComposeEnvironment $preChangeImageRef $null $manifest
            & docker compose --project-name $ProjectName --file $ComposeFile up --detach --no-build | Out-Host
            if ($LASTEXITCODE -eq 0) { $recoveryTransaction.previousStartState = 'started' } else { $recoveryTransaction.previousStartState = 'failed' }
        } catch { $recoveryTransaction.previousStartState = 'failed'; $recoveryTransaction.previousStartFailure = $_.Exception.Message }
    }
    Write-RecoveryTransaction $recoveryTransaction
    throw
}
$env:DING_PBX_SNAPSHOT_RECORD = (Join-Path $SnapshotDirectory 'snapshot-record.json')
$composeArgs = @('compose', '--project-name', $ProjectName, '--file', $ComposeFile, 'up', '--detach', '--no-build')
& docker @composeArgs
Assert-OperationDeadline
if ($LASTEXITCODE -ne 0) {
    $composeExitCode = $LASTEXITCODE
    $recoveryTransaction.state = 'compose-failed'; $recoveryTransaction.failure = "docker compose exited with $composeExitCode"; $recoveryTransaction.restoreState = 'started'; Write-RecoveryTransaction $recoveryTransaction
    try {
        if ($preChangeImageRef) { Restore-VolumeSnapshots $preChangeImageRef $manifest; $recoveryTransaction.restoreState = 'complete'; Set-ComposeEnvironment $preChangeImageRef $null $manifest; & docker compose --project-name $ProjectName --file $ComposeFile up --detach --no-build | Out-Host; if ($LASTEXITCODE -eq 0) { $recoveryTransaction.previousStartState = 'started' } else { $recoveryTransaction.previousStartState = 'failed' } }
    } catch { $recoveryTransaction.restoreState = 'failed'; $recoveryTransaction.restoreFailure = $_.Exception.Message }
    Write-RecoveryTransaction $recoveryTransaction
    throw "docker compose exited with $composeExitCode"
}
$ownershipOk = $true
$containerId = $null
try {
    $containerId = Get-OwnedContainerId
    Assert-OwnedDeployment $containerId $ImageRef
} catch {
    $ownershipOk = $false
    Write-Warning "Original rollout ownership validation failed: $($_.Exception.Message)"
}
$hostReachable = if ($ownershipOk) { Wait-HostReachable } else { $false }
$liveOk = if ($ownershipOk -and $hostReachable) { Wait-Healthy $containerId } else { $false }
$cliReady = if ($liveOk) { Wait-TargetReady $containerId } else { $false }
$serverReady = if ($liveOk -and $cliReady) { Wait-AuthenticatedReady } else { $false }
if (-not ($liveOk -and $cliReady -and $serverReady)) {
    Write-Warning "Original rollout outcome: failed. hostReachability=$hostReachable liveness=$liveOk localCliReady=$cliReady authenticatedServerReady=$serverReady image=$ImageRef"
    if (-not $PreviousImageRef) { throw 'Deployment stopped without an automatic rollback image.' }
    $previous = Read-Provenance $PreviousImageRef $true $previousManifest
    Set-ComposeEnvironment $PreviousImageRef $previous $previousManifest
    & docker compose --project-name $ProjectName --file $ComposeFile down --remove-orphans
    if ($LASTEXITCODE -ne 0) { throw 'Automatic rollback could not stop the failed owned Compose workload before restoring its volume state.' }
    Restore-VolumeSnapshots $PreviousImageRef $previousManifest
    & docker @composeArgs
    if ($LASTEXITCODE -ne 0) { throw 'Automatic rollback Compose update failed.' }
    $rollbackOwnership = $true
    $rollbackId = $null
    try {
        $rollbackId = Get-OwnedContainerId
        Assert-OwnedDeployment $rollbackId $PreviousImageRef
    } catch {
        $rollbackOwnership = $false
        Write-Warning "Rollback ownership validation failed: $($_.Exception.Message)"
    }
    $rollbackReachable = if ($rollbackOwnership) { Wait-HostReachable } else { $false }
    $rollbackLive = if ($rollbackOwnership -and $rollbackReachable) { Wait-Healthy $rollbackId } else { $false }
    $rollbackCli = if ($rollbackLive) { Wait-TargetReady $rollbackId } else { $false }
    $rollbackServer = if ($rollbackLive -and $rollbackCli) { Wait-AuthenticatedReady } else { $false }
    if (-not ($rollbackLive -and $rollbackCli -and $rollbackServer)) { throw "Original rollout failed and rollback failed. rollbackHostReachability=$rollbackReachable rollbackLiveness=$rollbackLive rollbackLocalCliReady=$rollbackCli rollbackAuthenticatedServerReady=$rollbackServer image=$PreviousImageRef" }
    $recoveryTransaction.state = 'rolled-back'; $recoveryTransaction.restoreState = 'complete'; $recoveryTransaction.previousStartState = 'started'; $recoveryTransaction.completedAt = [DateTimeOffset]::UtcNow.ToString('o'); Write-RecoveryTransaction $recoveryTransaction
    Write-Host "Rollback outcome: restored previous image and compatible volume state successfully. hostReachability=$rollbackReachable liveness=$rollbackLive localCliReady=$rollbackCli authenticatedServerReady=$rollbackServer image=$PreviousImageRef"
    throw 'The new image was rolled back after liveness or readiness failure.'
}
$recoveryTransaction.state = 'complete'; $recoveryTransaction.previousStartState = 'not-needed'; $recoveryTransaction.completedAt = [DateTimeOffset]::UtcNow.ToString('o'); Write-RecoveryTransaction $recoveryTransaction
Write-Host 'The immutable image reached healthy liveness. Target readiness remains authenticated at /api/v1/ready.'
