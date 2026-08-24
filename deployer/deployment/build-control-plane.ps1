[CmdletBinding()]
param(
    [string]$Tag = '',
    [string]$Version = 'dev',
    [string]$OutputDirectory = '',
    [switch]$NoCache
)

$ErrorActionPreference = 'Stop'
$deploymentRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $deploymentRoot '..\..')).Path
$dockerfile = Join-Path $deploymentRoot 'control-plane.Dockerfile'
$consoleLockfile = Join-Path $repoRoot 'console\package-lock.json'
$inputManifest = Join-Path $deploymentRoot 'inputs.lock.json'
. (Join-Path $deploymentRoot 'provenance.ps1')

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker is not available on PATH. Start a local Linux Docker engine before building; this script never contacts a host or deploys.'
}

$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceCommit -notmatch '^[0-9a-f]{40}$') {
    throw 'Could not resolve the exact source commit from the checkout.'
}
$dirty = @(& git -C $repoRoot status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect checkout state before building.' }
if ($dirty.Count -gt 0) {
    throw 'The build context has uncommitted changes. Commit the exact source revision before building a reproducible image.'
}
if ($Version -notmatch '^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$') { throw 'Version must be a bounded package version without shell syntax.' }
function File-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}
$dockerfileSha = File-Sha256 $dockerfile
$consoleLockSha = File-Sha256 $consoleLockfile
$inputManifestSha = File-Sha256 $inputManifest
$inputRecord = Get-Content -Raw -LiteralPath $inputManifest | ConvertFrom-Json
$resourceId = ([guid]::NewGuid().ToString('N'))
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) "ding-pbx-source-$resourceId.tar"
$contextRoot = Join-Path ([System.IO.Path]::GetTempPath()) "ding-pbx-source-context-$resourceId"
try {
    New-Item -ItemType Directory -Force -Path $contextRoot | Out-Null
    & git -C $repoRoot archive --format=tar --output=$archivePath HEAD
    if ($LASTEXITCODE -ne 0) { throw "git archive exited with $LASTEXITCODE" }
    $sourceTreeSha = File-Sha256 $archivePath
    & tar.exe -xf $archivePath -C $contextRoot
    if ($LASTEXITCODE -ne 0) { throw "tar extraction of the exact git archive exited with $LASTEXITCODE" }
} catch {
    if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
    if (Test-Path -LiteralPath $contextRoot) { Remove-Item -LiteralPath $contextRoot -Recurse -Force }
    throw
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = "ding-pbx-control-plane:$($sourceCommit.Substring(0, 12))"
}
$buildArgs = @(
    'build',
    '--file', (Join-Path $contextRoot 'deployer\deployment\control-plane.Dockerfile'),
    '--build-arg', "SOURCE_COMMIT=$sourceCommit",
    '--build-arg', "SOURCE_TREE_COMMIT=$sourceCommit",
    '--build-arg', "SOURCE_TREE_SHA256=$sourceTreeSha",
    '--build-arg', "DOCKERFILE_SHA256=$dockerfileSha",
    '--build-arg', "CONSOLE_LOCK_SHA256=$consoleLockSha",
    '--build-arg', "INPUT_MANIFEST_SHA256=$inputManifestSha",
    '--build-arg', "IMAGE_VERSION=$Version",
    '--label', "org.opencontainers.image.revision=$sourceCommit",
    '--label', "org.opencontainers.image.version=$Version",
    '--tag', $Tag
)
if ($NoCache) { $buildArgs += '--no-cache' }
$buildArgs += $contextRoot

Write-Host "Building hosted control plane from commit $sourceCommit with Docker's Linux engine."
Write-Host "Image tag: $Tag"
& docker @buildArgs
if ($LASTEXITCODE -ne 0) { throw "docker build exited with $LASTEXITCODE" }

$revision = (& docker image inspect $Tag --format '{{index .Config.Labels "org.opencontainers.image.revision"}}').Trim()
if ($LASTEXITCODE -ne 0 -or $revision -ne $sourceCommit) {
    throw "The built image revision label '$revision' does not match source commit $sourceCommit."
}
$imageId = (& docker image inspect $Tag --format '{{.Id}}').Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($imageId)) {
    throw 'Docker did not return an immutable local image identifier.'
}
$container = "ding-pbx-provenance-$resourceId"
$provenancePath = Join-Path ([System.IO.Path]::GetTempPath()) "$container.json"
$sbomPath = Join-Path ([System.IO.Path]::GetTempPath()) "$container-sbom.txt"
$sbomHashPath = Join-Path ([System.IO.Path]::GetTempPath()) "$container-sbom.sha256"
$nodeVersionPath = Join-Path ([System.IO.Path]::GetTempPath()) "$container-node.txt"
try {
    $container = (& docker create --label io.ding.pbx.inspect=true $Tag).Trim()
    if ($container -notmatch '^[0-9a-f]{12,64}$') { throw 'The provenance inspection helper did not return an immutable container id.' }
    if ($LASTEXITCODE -ne 0) { throw "docker create exited with $LASTEXITCODE" }
    & docker cp "${container}:/opt/ding-pbx-console/provenance.json" $provenancePath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker cp provenance exited with $LASTEXITCODE" }
    $provenance = Get-Content -Raw -LiteralPath $provenancePath | ConvertFrom-Json
    Assert-ProvenanceRecord -Record $provenance -ExpectedCommit $sourceCommit -ExpectedVersion $Version -ExpectedSourceTreeSha256 $sourceTreeSha -ExpectedDockerfileSha256 $dockerfileSha -ExpectedConsoleLockSha256 $consoleLockSha -ExpectedInputManifestSha256 $inputManifestSha -ExpectedUbuntuSnapshot $inputRecord.ubuntuSnapshot -ExpectedRuntimeBaseImage $inputRecord.ubuntuBase -ExpectedNodeBuildBaseImage $inputRecord.nodeBuildBase | Out-Null
    if ($provenance.sourceTreeSha256 -ne $sourceTreeSha -or $provenance.dockerfileSha256 -ne $dockerfileSha -or $provenance.consoleLockSha256 -ne $consoleLockSha -or $provenance.inputManifestSha256 -ne $inputManifestSha -or $provenance.ubuntuSnapshot -ne $inputRecord.ubuntuSnapshot -or $provenance.baseImages.runtime -ne $inputRecord.ubuntuBase -or $provenance.baseImages.nodeBuild -ne $inputRecord.nodeBuildBase) { throw 'Embedded provenance has an unexpected source-tree, Dockerfile, lockfile, input, base-image, or package snapshot digest.' }
    & docker cp "${container}:/opt/ding-pbx-console/sbom-apt.txt" $sbomPath | Out-Null
    & docker cp "${container}:/opt/ding-pbx-console/sbom-apt.sha256" $sbomHashPath | Out-Null
    & docker cp "${container}:/opt/ding-pbx-console/node-runtime-version.txt" $nodeVersionPath | Out-Null
    if (-not (Test-Path -LiteralPath $sbomPath) -or (Get-Item -LiteralPath $sbomPath).Length -eq 0) { throw 'The image did not contain an apt package SBOM.' }
    if ((Get-FileHash -LiteralPath $sbomPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne ((Get-Content -Raw -LiteralPath $sbomHashPath).Trim().Split(' ')[0])) { throw 'The apt SBOM hash record does not match its contents.' }
    if ($provenance.aptSbomSha256 -ne ((Get-Content -Raw -LiteralPath $sbomHashPath).Trim().Split(' ')[0])) { throw 'Embedded provenance does not match the apt SBOM hash.' }
    if ((Get-Content -Raw -LiteralPath $nodeVersionPath).Trim() -ne 'v22.23.2') { throw 'The copied Node runtime is not v22.23.2.' }
} finally {
    $owned = (& docker inspect --format '{{index .Config.Labels "io.ding.pbx.inspect"}}' $container 2>$null).Trim()
    if ($owned -eq 'true') { & docker rm $container | Out-Null }
    if (Test-Path -LiteralPath $provenancePath) { Remove-Item -LiteralPath $provenancePath -Force }
    if (Test-Path -LiteralPath $sbomPath) { Remove-Item -LiteralPath $sbomPath -Force }
    if (Test-Path -LiteralPath $sbomHashPath) { Remove-Item -LiteralPath $sbomHashPath -Force }
    if (Test-Path -LiteralPath $nodeVersionPath) { Remove-Item -LiteralPath $nodeVersionPath -Force }
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $deploymentRoot 'out'
}
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$record = [ordered]@{
    schemaVersion = 1
    sourceCommit = $sourceCommit
    image = $Tag
    imageId = $imageId
    imageVersion = $Version
    dockerfileSha256 = $dockerfileSha
    sourceTreeSha256 = $sourceTreeSha
    consoleLockSha256 = $consoleLockSha
    inputManifestSha256 = $inputManifestSha
    dockerfile = 'deployer/deployment/control-plane.Dockerfile'
    builtAt = [DateTimeOffset]::UtcNow.ToString('o')
    deployment = 'not performed by this script'
}
$recordPath = Join-Path $OutputDirectory 'control-plane-image.json'
[System.IO.File]::WriteAllText($recordPath, ($record | ConvertTo-Json -Depth 4), [System.Text.UTF8Encoding]::new($false))
Write-Host "Built image verified for source commit $sourceCommit."
Write-Host "Provenance record: $recordPath"
if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
if (Test-Path -LiteralPath $contextRoot) { Remove-Item -LiteralPath $contextRoot -Recurse -Force }
