function Assert-ProvenanceRecord {
    param(
        [Parameter(Mandatory)] $Record,
        [Parameter(Mandatory)] [string]$ExpectedCommit,
        [Parameter(Mandatory)] [string]$ExpectedVersion,
        [Parameter(Mandatory)] [string]$ExpectedDockerfileSha256,
        [Parameter(Mandatory)] [string]$ExpectedConsoleLockSha256,
        [Parameter(Mandatory)] [string]$ExpectedInputManifestSha256
    )
    if ($null -eq $Record -or $Record.schemaVersion -ne 1) { throw 'Provenance schema version is not 1.' }
    if ($Record.sourceCommit -ne $ExpectedCommit -or $Record.sourceTreeCommit -ne $ExpectedCommit) { throw 'Provenance source commit does not match the deployment manifest.' }
    if ($Record.imageVersion -ne $ExpectedVersion) { throw 'Provenance image version does not match the deployment manifest.' }
    foreach ($pair in @(
        @($Record.sourceTreeSha256, 'source tree'),
        @($Record.dockerfileSha256, 'Dockerfile'),
        @($Record.consoleLockSha256, 'console lockfile'),
        @($Record.inputManifestSha256, 'input manifest')
    )) {
        if ([string]$pair[0] -notmatch '^[0-9a-f]{64}$') { throw "Provenance $($pair[1]) digest is invalid." }
    }
    if ($Record.ubuntuSnapshot -notmatch '^[0-9]{8}T[0-9]{6}Z$') { throw 'Provenance Ubuntu snapshot is invalid.' }
    if ($Record.aptSbomSha256 -notmatch '^[0-9a-f]{64}$') { throw 'Provenance apt SBOM digest is invalid.' }
    if (-not $Record.sbom -or $Record.sbom.Count -lt 2) { throw 'Provenance does not name the complete SBOM records.' }
    return $true
}

function Assert-ImmutableImageReference {
    param([Parameter(Mandatory)] [string]$Reference)
    if ($Reference -notmatch '@sha256:[0-9a-f]{64}$') { throw 'Image reference must be immutable image@sha256.' }
    return $true
}

function Assert-ExternalDeploymentManifest {
    param(
        [Parameter(Mandatory)] $Manifest,
        [Parameter(Mandatory)] [string]$ImageReference,
        [Parameter(Mandatory)] [string]$ProjectName,
        [Parameter(Mandatory)] [int]$Port
    )
    Assert-ImmutableImageReference $ImageReference | Out-Null
    if ($Manifest.schemaVersion -ne 1 -or $Manifest.image -ne $ImageReference -or $Manifest.projectName -ne $ProjectName -or [int]$Manifest.adminPort -ne $Port -or $Manifest.networkMode -ne 'admin-only' -or $Manifest.target -notin @('local-docker', 'approved-ssh')) {
        throw 'External deployment manifest does not match image, project, or admin port.'
    }
    if ($Manifest.sourceCommit -notmatch '^[0-9a-f]{40}$' -or $Manifest.version -notmatch '^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$') { throw 'External deployment manifest commit or version is invalid.' }
    if ($Manifest.provenanceSha256 -notmatch '^[0-9a-f]{64}$') { throw 'External deployment manifest provenance digest is invalid.' }
    foreach ($field in @('sourceTreeSha256', 'dockerfileSha256', 'consoleLockSha256', 'inputManifestSha256', 'aptSbomSha256')) {
        if ([string]$Manifest.$field -notmatch '^[0-9a-f]{64}$') { throw "External deployment manifest $field is invalid." }
    }
    if ($Manifest.preflightEvidencePath -and -not (Test-Path -LiteralPath $Manifest.preflightEvidencePath)) { throw 'External deployment manifest preflight evidence is missing.' }
    return $true
}
