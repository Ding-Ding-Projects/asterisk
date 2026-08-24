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
$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
Assert-ExternalDeploymentManifest -Manifest $manifest -ManifestPath $ManifestPath -ImageReference $ImageRef -ProjectName $ProjectName -Port $AdminPort | Out-Null
if ($manifest.target -ne 'local-docker') { throw 'Hosted deployment is restricted to the local Yere Dow engine. Approved SSH inventory is read-only preflight evidence only.' }
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
}

function Read-Provenance([string]$Reference, [bool]$InspectEmbedded, $ExpectedManifest) {
    $container = "ding-pbx-deploy-inspect-$PID"
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
        if ($labelRevision -notmatch '^[0-9a-f]{40}$' -or [string]::IsNullOrWhiteSpace($labelVersion)) { throw 'The final image is missing its source revision or version label.' }
        if ($labelRevision -ne $ExpectedManifest.sourceCommit -or $labelVersion -ne $ExpectedManifest.version) { throw 'The image labels do not match the external deployment manifest.' }
        if (-not $InspectEmbedded) { return [pscustomobject]@{ sourceCommit = [string]$ExpectedManifest.sourceCommit; imageVersion = [string]$ExpectedManifest.version; schemaVersion = 0 } }
        & docker create --label io.ding.pbx.inspect=true --name $container $Reference | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "docker create exited with $LASTEXITCODE" }
        $created = $true
        & docker cp "${container}:/opt/ding-pbx-console/provenance.json" $path | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'The image has no embedded provenance.json.' }
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedManifest.provenanceSha256) { throw 'Embedded provenance SHA-256 does not match the external deployment manifest.' }
        $record = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
        Assert-ProvenanceRecord -Record $record -ExpectedCommit $ExpectedManifest.sourceCommit -ExpectedVersion $ExpectedManifest.version -ExpectedDockerfileSha256 $ExpectedManifest.dockerfileSha256 -ExpectedConsoleLockSha256 $ExpectedManifest.consoleLockSha256 -ExpectedInputManifestSha256 $ExpectedManifest.inputManifestSha256 -ExpectedUbuntuSnapshot $ExpectedManifest.ubuntuSnapshot -ExpectedRuntimeBaseImage $ExpectedManifest.runtimeBaseImage -ExpectedNodeBuildBaseImage $ExpectedManifest.nodeBuildBaseImage | Out-Null
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
    $env:DING_PBX_INTERNAL_HOST = '0.0.0.0'
    if ($BindAddress -in @('127.0.0.1', '::1', 'localhost')) { $env:DING_PBX_INTERNAL_HOST = $BindAddress }
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
        $state = (& docker inspect --format '{{.State.Health.Status}}' $ContainerId 2>$null).Trim()
        if ($state -eq 'healthy') { return $true }
        if ($state -eq 'unhealthy' -or $state -eq 'exited') { return $false }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-TargetReady([string]$ContainerId) {
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        $output = @(& docker exec $ContainerId asterisk -rx 'core show version' 2>&1)
        $parsed = Parse-AsteriskReadinessText ($output -join "`n")
        if ($LASTEXITCODE -eq 0 -and $parsed.ok) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-AuthenticatedReady {
    $cookie = (Get-Content -Raw -LiteralPath $SessionCookieFile).Trim()
    if ([string]::IsNullOrWhiteSpace($cookie) -or $cookie -notmatch '^ding_session=') { throw 'Session cookie file does not contain the expected protected operator cookie.' }
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.ServerCertificateCustomValidationCallback = { $true }
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(5)
    try {
        $client.DefaultRequestHeaders.Add('Cookie', $cookie)
        $response = $client.GetAsync("https://127.0.0.1:$AdminPort/api/v1/ready").GetAwaiter().GetResult()
        $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        if (-not $response.IsSuccessStatusCode -or $body.status -ne 'ready' -or [string]$body.asteriskVersion -notmatch '^[0-9]+\.[0-9]+(?:\.[0-9]+)?') { return $false }
        return $true
    } finally { $client.Dispose(); $handler.Dispose() }
}

function Snapshot-Volumes {
    New-Item -ItemType Directory -Force -Path $SnapshotDirectory | Out-Null
    $volumes = @('ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool')
    foreach ($volume in $volumes) {
        $safe = $volume.Replace('-', '_')
        $name = "ding-pbx-snapshot-$PID-$safe"
        $destination = Join-Path $SnapshotDirectory "$safe.tar"
        $snapshotId = (& docker run --detach --label io.ding.pbx.snapshot=true --name $name --user 10001 --entrypoint /bin/tar -v "${volume}:/source:ro" -v "${SnapshotDirectory}:/backup" $ImageRef -cf "/backup/$safe.tar" -C /source .).Trim()
        if ($LASTEXITCODE -ne 0 -or $snapshotId -notmatch '^[0-9a-f]{12,64}$') { throw "Could not start owned volume snapshot for $volume." }
        do { Start-Sleep -Milliseconds 250; $state = (& docker inspect --format '{{.State.Status}}' $snapshotId 2>$null).Trim() } while ($state -eq 'running')
        $exitCode = (& docker inspect --format '{{.State.ExitCode}}' $snapshotId 2>$null).Trim()
        $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.snapshot"}}' $snapshotId 2>$null).Trim()
        if ($owned -ne 'true') { throw "Snapshot helper $name is not owned." }
        & docker rm $snapshotId | Out-Null
        if ($exitCode -ne '0' -or -not (Test-Path -LiteralPath $destination)) { throw "Volume snapshot failed for $volume." }
    }
    $snapshotRecord = [ordered]@{ schemaVersion = 1; sourceImage = $ImageRef; sourceCommit = $manifest.sourceCommit; sourceVersion = $manifest.version; volumes = $volumes; createdAt = [DateTimeOffset]::UtcNow.ToString('o'); compatibility = 'restore only into the same mount profile and a manifest with matching volume names' }
    [System.IO.File]::WriteAllText((Join-Path $SnapshotDirectory 'snapshot-record.json'), ($snapshotRecord | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
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

$record = Read-Provenance $ImageRef $Execute $manifest
Set-ComposeEnvironment $ImageRef $record $manifest
Write-Host "Prepared immutable image $ImageRef from source commit $($record.sourceCommit), version $($record.imageVersion)."
if (-not $Execute) {
    Write-Host 'Plan only. No Compose state changed. Re-run with -Execute after reviewing the preflight and provenance.'
    exit 0
}

$snapshotPath = $SnapshotDirectory
Snapshot-Volumes
$env:DING_PBX_SNAPSHOT_RECORD = (Join-Path $SnapshotDirectory 'snapshot-record.json')
$composeArgs = @('compose', '--project-name', $ProjectName, '--file', $ComposeFile, 'up', '--detach', '--no-build')
& docker @composeArgs
if ($LASTEXITCODE -ne 0) { throw "docker compose exited with $LASTEXITCODE" }
$ownershipOk = $true
$containerId = $null
try {
    $containerId = Get-OwnedContainerId
    Assert-OwnedDeployment $containerId $ImageRef
} catch {
    $ownershipOk = $false
    Write-Warning "Original rollout ownership validation failed: $($_.Exception.Message)"
}
$liveOk = if ($ownershipOk) { Wait-Healthy $containerId } else { $false }
$cliReady = if ($liveOk) { Wait-TargetReady $containerId } else { $false }
$serverReady = if ($liveOk -and $cliReady) { Wait-AuthenticatedReady } else { $false }
if (-not ($liveOk -and $cliReady -and $serverReady)) {
    Write-Warning "Original rollout outcome: failed. liveness=$liveOk localCliReady=$cliReady authenticatedServerReady=$serverReady image=$ImageRef"
    if (-not $PreviousImageRef) { throw 'Deployment stopped without an automatic rollback image.' }
    $previous = Read-Provenance $PreviousImageRef $true $previousManifest
    Set-ComposeEnvironment $PreviousImageRef $previous $previousManifest
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
    $rollbackLive = if ($rollbackOwnership) { Wait-Healthy $rollbackId } else { $false }
    $rollbackCli = if ($rollbackLive) { Wait-TargetReady $rollbackId } else { $false }
    $rollbackServer = if ($rollbackLive -and $rollbackCli) { Wait-AuthenticatedReady } else { $false }
    if (-not ($rollbackLive -and $rollbackCli -and $rollbackServer)) { throw "Original rollout failed and rollback failed. rollbackLiveness=$rollbackLive rollbackLocalCliReady=$rollbackCli rollbackAuthenticatedServerReady=$rollbackServer image=$PreviousImageRef" }
    Write-Host "Rollback outcome: restored previous image successfully. liveness=$rollbackLive localCliReady=$rollbackCli authenticatedServerReady=$rollbackServer image=$PreviousImageRef"
    throw 'The new image was rolled back after liveness or readiness failure.'
}
Write-Host 'The immutable image reached healthy liveness. Target readiness remains authenticated at /api/v1/ready.'
