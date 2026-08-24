function Assert-ProvenanceRecord {
    param(
        [Parameter(Mandatory)] $Record,
        [Parameter(Mandatory)] [string]$ExpectedCommit,
        [Parameter(Mandatory)] [string]$ExpectedVersion,
        [Parameter(Mandatory)] [string]$ExpectedSourceTreeSha256,
        [Parameter(Mandatory)] [string]$ExpectedDockerfileSha256,
        [Parameter(Mandatory)] [string]$ExpectedConsoleLockSha256,
        [Parameter(Mandatory)] [string]$ExpectedInputManifestSha256
        ,[Parameter(Mandatory)] [string]$ExpectedUbuntuSnapshot
        ,[Parameter(Mandatory)] [string]$ExpectedRuntimeBaseImage
        ,[Parameter(Mandatory)] [string]$ExpectedNodeBuildBaseImage
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
    if ($Record.ubuntuSnapshot -ne $ExpectedUbuntuSnapshot -or $Record.baseImages.runtime -ne $ExpectedRuntimeBaseImage -or $Record.baseImages.nodeBuild -ne $ExpectedNodeBuildBaseImage) { throw 'Provenance base image or snapshot does not match the external identity.' }
    if ($Record.sourceTreeSha256 -ne $ExpectedSourceTreeSha256 -or $Record.dockerfileSha256 -ne $ExpectedDockerfileSha256 -or $Record.consoleLockSha256 -ne $ExpectedConsoleLockSha256 -or $Record.inputManifestSha256 -ne $ExpectedInputManifestSha256) { throw 'Provenance source or input digests do not match the external identity.' }
    if ($Record.aptSbomSha256 -notmatch '^[0-9a-f]{64}$') { throw 'Provenance apt SBOM digest is invalid.' }
    if ((@($Record.sbom) -join '|') -ne (@('sbom-apt.txt', 'sbom-apt.sha256', 'node-runtime-version.txt') -join '|')) { throw 'Provenance does not name the exact complete SBOM records.' }
    return $true
}

function Assert-ImmutableImageReference {
    param([Parameter(Mandatory)] [string]$Reference)
    if ($Reference -notmatch '@sha256:[0-9a-f]{64}$') { throw 'Image reference must be immutable image@sha256.' }
    return $true
}

function Assert-DeploymentManifestSchemaPowerShell {
    param([Parameter(Mandatory)] $Value, [Parameter(Mandatory)] $Rule, [Parameter(Mandatory)] [string]$Path = '$')
    if ($null -ne $Rule.const -and (($Value | ConvertTo-Json -Compress -Depth 8) -ne ($Rule.const | ConvertTo-Json -Compress -Depth 8))) { throw "Manifest $Path must equal $($Rule.const | ConvertTo-Json -Compress)." }
    if ($null -ne $Rule.enum -and -not (@($Rule.enum) | Where-Object { ($_ | ConvertTo-Json -Compress -Depth 8) -eq ($Value | ConvertTo-Json -Compress -Depth 8) })) { throw "Manifest $Path is not an allowed value." }
    switch ([string]$Rule.type) {
        'object' {
            if ($null -eq $Value -or $Value -is [string] -or $Value -is [System.Collections.IEnumerable] -and $Value -isnot [pscustomobject]) { throw "Manifest $Path must be an object." }
            foreach ($required in @($Rule.required)) { if (-not ($Value.PSObject.Properties.Name -contains [string]$required)) { throw "Manifest $Path is missing required field $required." } }
            $properties = @($Rule.properties.PSObject.Properties.Name)
            if ($Rule.additionalProperties -eq $false) { foreach ($property in $Value.PSObject.Properties.Name) { if ($property -notin $properties) { throw "Manifest $Path contains unknown field $property." } } }
            foreach ($property in $Value.PSObject.Properties) { $child = $Rule.properties.$($property.Name); if ($null -ne $child) { Assert-DeploymentManifestSchemaPowerShell $property.Value $child "$Path.$($property.Name)" } }
        }
        'array' {
            if ($Value -isnot [System.Collections.IEnumerable] -or $Value -is [string]) { throw "Manifest $Path must be an array." }
            $index = 0; foreach ($item in @($Value)) { if ($null -ne $Rule.items) { Assert-DeploymentManifestSchemaPowerShell $item $Rule.items "$Path[$index]" }; $index++ }
        }
        'string' {
            if ($Value -isnot [string]) { throw "Manifest $Path must be a string." }
            if ($null -ne $Rule.minLength -and $Value.Length -lt [int]$Rule.minLength) { throw "Manifest $Path is too short." }
            if ($Rule.pattern -and $Value -notmatch [string]$Rule.pattern) { throw "Manifest $Path does not match its pattern." }
            if ($Rule.format -eq 'date-time') { $parsed = [DateTimeOffset]::MinValue; if (-not [DateTimeOffset]::TryParse($Value, [ref]$parsed)) { throw "Manifest $Path is not a date-time." } }
        }
        'integer' { if ($Value -isnot [int] -and $Value -isnot [long] -and $Value -isnot [decimal] -or [decimal]$Value -ne [math]::Truncate([decimal]$Value) -or $null -ne $Rule.minimum -and [decimal]$Value -lt [decimal]$Rule.minimum -or $null -ne $Rule.maximum -and [decimal]$Value -gt [decimal]$Rule.maximum) { throw "Manifest $Path must be an integer in range." } }
    }
}

function Assert-ExternalDeploymentManifest {
    param(
        [Parameter(Mandatory)] $Manifest,
        [Parameter(Mandatory)] [string]$ManifestPath,
        [Parameter(Mandatory)] [string]$ImageReference,
        [Parameter(Mandatory)] [string]$ProjectName,
        [Parameter(Mandatory)] [int]$Port
    )
    $schemaPath = Join-Path $PSScriptRoot 'deployment-manifest.schema.json'
    if (-not (Test-Path -LiteralPath $schemaPath)) { throw 'Committed deployment manifest schema is missing.' }
    $schema = Get-Content -Raw -LiteralPath $schemaPath | ConvertFrom-Json
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) {
        & $nodeCommand.Source (Join-Path $PSScriptRoot 'validate-deployment-manifest.mjs') $ManifestPath $schemaPath | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Committed deployment manifest JSON Schema validation failed.' }
    } else {
        Assert-DeploymentManifestSchemaPowerShell -Value $Manifest -Rule $schema
    }
    foreach ($field in @($schema.required)) {
        if (-not ($Manifest.PSObject.Properties.Name -contains [string]$field)) { throw "External deployment manifest is missing schema field $field." }
    }
    Assert-ImmutableImageReference $ImageReference | Out-Null
    if ($Manifest.schemaVersion -ne 1 -or $Manifest.image -ne $ImageReference -or $Manifest.projectName -ne $ProjectName -or [int]$Manifest.adminPort -ne $Port -or $Manifest.networkMode -ne 'admin-only' -or $Manifest.target -notin @('local-docker', 'approved-ssh')) {
        throw 'External deployment manifest does not match image, project, or admin port.'
    }
    if ($Manifest.mountProfile -ne 'five-volumes-plus-run-tmpfs' -or $Manifest.volumeSchemaVersion -ne 1 -or (@($Manifest.mountInventory) -join '|') -ne (@('ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool', '/run/asterisk:tmpfs') -join '|')) { throw 'External deployment manifest volume schema or mount inventory does not match Compose.' }
    if ([string]::IsNullOrWhiteSpace([string]$Manifest.targetHost) -or [string]::IsNullOrWhiteSpace([string]$Manifest.targetUser) -or [int]$Manifest.targetSshPort -lt 0 -or [string]::IsNullOrWhiteSpace([string]$Manifest.inventoryPath)) { throw 'External deployment manifest target identity is incomplete.' }
    if ($Manifest.sourceCommit -notmatch '^[0-9a-f]{40}$' -or $Manifest.version -notmatch '^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$') { throw 'External deployment manifest commit or version is invalid.' }
    if ($Manifest.provenanceSha256 -notmatch '^[0-9a-f]{64}$') { throw 'External deployment manifest provenance digest is invalid.' }
    foreach ($field in @('sourceTreeSha256', 'dockerfileSha256', 'consoleLockSha256', 'inputManifestSha256', 'aptSbomSha256')) {
        if ([string]$Manifest.$field -notmatch '^[0-9a-f]{64}$') { throw "External deployment manifest $field is invalid." }
    }
    if ($Manifest.preflightEvidencePath -and -not (Test-Path -LiteralPath $Manifest.preflightEvidencePath)) { throw 'External deployment manifest preflight evidence is missing.' }
    if ($Manifest.preflightEvidenceSha256 -notmatch '^[0-9a-f]{64}$') { throw 'External deployment manifest preflight evidence digest is invalid.' }
    $manifestExpiry = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse([string]$Manifest.preflightExpiresAt, [ref]$manifestExpiry)) { throw 'External deployment manifest preflight expiry is invalid.' }
    if ($manifestExpiry -le [DateTimeOffset]::UtcNow) { throw 'External deployment manifest preflight evidence has expired.' }
    if ($Manifest.ubuntuSnapshot -notmatch '^[0-9]{8}T[0-9]{6}Z$' -or $Manifest.runtimeBaseImage -notmatch '@sha256:[0-9a-f]{64}$' -or $Manifest.nodeBuildBaseImage -notmatch '@sha256:[0-9a-f]{64}$') { throw 'External deployment manifest base input identity is invalid.' }
    return $true
}
