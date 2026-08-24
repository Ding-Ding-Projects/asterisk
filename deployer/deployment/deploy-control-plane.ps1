[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$ImageRef,
    [Parameter(Mandatory)] [string]$TlsCertFile,
    [Parameter(Mandatory)] [string]$TlsKeyFile,
    [string]$PreviousImageRef = '',
    [string]$ComposeFile = "$PSScriptRoot\docker-compose.yml",
    [string]$ProjectName = 'ding-pbx-control-plane',
    [string]$BindAddress = '127.0.0.1',
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
if ($ImageRef -notmatch '@sha256:[0-9a-f]{64}$') { throw 'ImageRef must be an immutable image@sha256 reference.' }
if ($PreviousImageRef -and $PreviousImageRef -notmatch '@sha256:[0-9a-f]{64}$') { throw 'PreviousImageRef must be an immutable image@sha256 reference.' }
if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Compose file does not exist: $ComposeFile" }
if (-not (Test-Path -LiteralPath $TlsCertFile)) { throw "TLS certificate path does not exist: $TlsCertFile" }
if (-not (Test-Path -LiteralPath $TlsKeyFile)) { throw "TLS private key path does not exist: $TlsKeyFile" }

function Read-Provenance([string]$Reference) {
    $container = "ding-pbx-deploy-inspect-$PID"
    $path = Join-Path ([System.IO.Path]::GetTempPath()) "$container.json"
    try {
        & docker pull $Reference | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "docker pull exited with $LASTEXITCODE" }
        $labelRevision = (& docker image inspect $Reference --format '{{index .Config.Labels "org.opencontainers.image.revision"}}').Trim()
        $labelVersion = (& docker image inspect $Reference --format '{{index .Config.Labels "org.opencontainers.image.version"}}').Trim()
        if ($labelRevision -notmatch '^[0-9a-f]{40}$' -or [string]::IsNullOrWhiteSpace($labelVersion)) { throw 'The final image is missing its source revision or version label.' }
        & docker create --name $container $Reference | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "docker create exited with $LASTEXITCODE" }
        & docker cp "${container}:/opt/ding-pbx-console/provenance.json" $path | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'The image has no embedded provenance.json.' }
        $record = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
        if ($record.schemaVersion -ne 1 -or $record.sourceCommit -notmatch '^[0-9a-f]{40}$' -or $record.imageVersion -notmatch '^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$') {
            throw 'The embedded provenance has an invalid schema, source commit, or version.'
        }
        if ($labelRevision -ne $record.sourceCommit -or $labelVersion -ne $record.imageVersion) { throw 'The final image labels do not match embedded provenance.' }
        return $record
    } finally {
        & docker rm $container | Out-Null
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    }
}

function Set-ComposeEnvironment([string]$Reference, $Record) {
    $env:DING_PBX_IMAGE = $Reference
    $env:DING_PBX_SOURCE_COMMIT = [string]$Record.sourceCommit
    $env:DING_PBX_VERSION = [string]$Record.imageVersion
    $env:DING_PBX_TLS_CERT_FILE = (Resolve-Path -LiteralPath $TlsCertFile).Path
    $env:DING_PBX_TLS_KEY_FILE = (Resolve-Path -LiteralPath $TlsKeyFile).Path
    $env:DING_PBX_BIND_ADDRESS = $BindAddress
}

function Wait-Healthy {
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        $state = (& docker inspect --format '{{.State.Health.Status}}' ding-pbx-control-plane 2>$null).Trim()
        if ($state -eq 'healthy') { return $true }
        if ($state -eq 'unhealthy' -or $state -eq 'exited') { return $false }
        Start-Sleep -Seconds 2
    }
    return $false
}

$record = Read-Provenance $ImageRef
Set-ComposeEnvironment $ImageRef $record
Write-Host "Prepared immutable image $ImageRef from source commit $($record.sourceCommit), version $($record.imageVersion)."
if (-not $Execute) {
    Write-Host 'Plan only. No Compose state changed. Re-run with -Execute after reviewing the preflight and provenance.'
    exit 0
}

$composeArgs = @('compose', '--project-name', $ProjectName, '--file', $ComposeFile, 'up', '--detach', '--no-build')
& docker @composeArgs
if ($LASTEXITCODE -ne 0 -or -not (Wait-Healthy)) {
    Write-Warning 'The new control-plane image did not reach a healthy liveness state.'
    if (-not $PreviousImageRef) { throw 'Deployment stopped without an automatic rollback image.' }
    $previous = Read-Provenance $PreviousImageRef
    Set-ComposeEnvironment $PreviousImageRef $previous
    & docker @composeArgs
    if ($LASTEXITCODE -ne 0 -or -not (Wait-Healthy)) { throw 'Automatic rollback also failed its liveness healthcheck.' }
    throw 'The new image was rolled back after its liveness healthcheck failed.'
}
Write-Host 'The immutable image reached healthy liveness. Target readiness remains authenticated at /api/v1/ready.'
