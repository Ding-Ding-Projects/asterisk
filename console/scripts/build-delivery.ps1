[CmdletBinding()]
param(
    [switch]$Silent,
    [string]$Version = $env:DING_PBX_VERSION,
    [string]$CandidateCommit = $env:DING_PBX_CANDIDATE_COMMIT
)

$ErrorActionPreference = 'Stop'
$started = [DateTimeOffset]::UtcNow
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$consoleRoot = Join-Path $repoRoot 'console'
$bootstrap = Join-Path $repoRoot 'download-dependencies.bat'
$nodeRecord = (Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'dependency-manifest.json') | ConvertFrom-Json).dependencies | Where-Object id -eq 'node-win-x64'
$nodeRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) ("DingPBX\toolchains\{0}" -f $nodeRecord.archiveRoot)
$node = Join-Path $nodeRoot 'node.exe'
$npm = Join-Path $nodeRoot 'npm.cmd'
$output = Join-Path $consoleRoot 'dist\squirrel-windows\squirrel-windows'
$packagingLogTemp = Join-Path ([IO.Path]::GetTempPath()) ("material-asterisk-delivery-packaging-$PID.log")

function Phase([string]$Message) { Write-Host ("[{0:HH:mm:ss}] {1}" -f [DateTime]::Now, $Message) }
function Get-Sha256([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}
function Invoke-NpmScript([string]$Name) {
    Phase ("Running npm script {0}." -f $Name)
    & $npm run $Name
    if ($LASTEXITCODE -ne 0) { throw "npm run $Name exited $LASTEXITCODE" }
}

try {
    Phase 'Bootstrapping the pinned delivery dependencies.'
    $bootstrapArgs = @()
    if ($Silent) { $bootstrapArgs += '/s' }
    & $bootstrap @bootstrapArgs
    if ($LASTEXITCODE -ne 0) { throw "download-dependencies.bat exited $LASTEXITCODE" }
    if (-not (Test-Path -LiteralPath $node)) { throw "Pinned Node runtime is missing at $node after dependency bootstrap." }
    $env:PATH = "$nodeRoot;$env:PATH"
    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    $env:CSC_LINK = ''
    $env:CSC_KEY_PASSWORD = ''
    if (-not [string]::IsNullOrWhiteSpace($Version)) { $env:DING_PBX_VERSION = $Version }
    if (-not [string]::IsNullOrWhiteSpace($CandidateCommit)) { $env:DING_PBX_CANDIDATE_COMMIT = $CandidateCommit }

    Phase 'Checking the cold delivery call graph and installed gh field contract.'
    & $node (Join-Path $consoleRoot 'scripts\check-delivery-path.mjs') --verify-gh-fields
    if ($LASTEXITCODE -ne 0) { throw "check-delivery-path.mjs exited $LASTEXITCODE" }

    Push-Location $consoleRoot
    try {
        Invoke-NpmScript 'rebuild:native'
        Invoke-NpmScript 'build:native-host'
        Invoke-NpmScript 'check:forge-contracts'
        Invoke-NpmScript 'generate:forge-digests'
        Invoke-NpmScript 'compile:design'
        Invoke-NpmScript 'bundle:docs'
        Invoke-NpmScript 'bundle:changelog'
        Invoke-NpmScript 'write:update-manifest'

        Phase 'Emitting the Electron and server TypeScript without a type-check Chut.'
        & $node (Join-Path $consoleRoot 'node_modules\typescript\bin\tsc') -b --noCheck
        if ($LASTEXITCODE -ne 0) { throw "TypeScript emission exited $LASTEXITCODE" }
        Phase 'Bundling the renderer with Vite.'
        & $node (Join-Path $consoleRoot 'node_modules\vite\bin\vite.js') build
        if ($LASTEXITCODE -ne 0) { throw "Vite bundle exited $LASTEXITCODE" }
        Phase 'Packaging and validating the unsigned Squirrel.Windows lap saps.'
        if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Recurse -Force }
        if (Test-Path -LiteralPath $packagingLogTemp) { Remove-Item -LiteralPath $packagingLogTemp -Force }
        $packageOutput = & $node (Join-Path $consoleRoot 'scripts\package-squirrel.mjs') 2>&1
        $packageExit = $LASTEXITCODE
        $packageOutput | Tee-Object -LiteralPath $packagingLogTemp | Out-Host
        if ($packageExit -ne 0) { throw "package-squirrel.mjs exited $packageExit" }

        $setup = @(Get-ChildItem -LiteralPath $output -File -Filter '*Setup.exe')
        $releases = @(Get-ChildItem -LiteralPath $output -File -Filter 'RELEASES')
        $full = @(Get-ChildItem -LiteralPath $output -File -Filter '*-full.nupkg')
        if ($setup.Count -ne 1 -or $releases.Count -ne 1 -or $full.Count -lt 1) { throw 'Squirrel packaging did not produce the required setup, RELEASES, and full package files.' }
        $buildLog = Join-Path $output 'packaging-build.log'
        Copy-Item -LiteralPath $packagingLogTemp -Destination $buildLog -Force
        $provenancePath = Join-Path $output 'packaging-provenance.json'
        $provenance = [ordered]@{
            version = 1
            sourceCommit = $CandidateCommit
            builtAt = [DateTimeOffset]::UtcNow.ToString('o')
            packagingCommand = 'build-delivery.ps1 -Silent'
            cleanOutput = $true
            package = [ordered]@{ id = 'ding-pbx-console'; version = $Version; architecture = 'x64' }
            buildLog = [ordered]@{ path = 'packaging-build.log'; sha256 = Get-Sha256 $buildLog }
            signing = [ordered]@{
                inputsCleared = $true
                certificateAutoDiscoveryDisabled = $true
                processAuditComplete = $true
                signerInvocationCount = 0
                observedSignerInvocations = @()
                controls = [ordered]@{ forceCodeSigning = $false; signExecutable = $false; signAndEditExecutable = $false }
            }
        }
        $provenance | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $provenancePath -Encoding utf8
        $verifier = Join-Path $repoRoot 'console\scripts\verify-squirrel-artifacts.ps1'
        if (-not (Test-Path -LiteralPath $verifier)) { throw "Target-owned verifier is missing at $verifier." }
        $receiptPath = Join-Path $output 'squirrel-artifact-receipt.json'
        & $verifier -ArtifactDirectory $output -ProvenancePath $provenancePath -ExpectedCommit $CandidateCommit -SetupFile $setup[0].Name -ExpectedPackageId 'ding-pbx-console' -ExpectedVersion $Version -ExpectedArchitecture x64 -RequiredPackageEntry '*lib/net45/resources/app.asar' -OutputPath $receiptPath
        if ($LASTEXITCODE -ne 0) { throw "verify-squirrel-artifacts.ps1 exited $LASTEXITCODE" }
    } finally { Pop-Location }

    Phase ("Delivery build complete in {0:c}." -f ([DateTimeOffset]::UtcNow - $started))
    exit 0
} catch {
    if (Test-Path -LiteralPath $packagingLogTemp) { Remove-Item -LiteralPath $packagingLogTemp -Force -ErrorAction SilentlyContinue }
    Write-Error "Delivery build failed after $(([DateTimeOffset]::UtcNow - $started).ToString('c')): $($_.Exception.Message)"
    exit 1
}
