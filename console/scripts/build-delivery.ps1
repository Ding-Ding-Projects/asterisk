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

function Phase([string]$Message) { Write-Host ("[{0:HH:mm:ss}] {1}" -f [DateTime]::Now, $Message) }
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
        & $node (Join-Path $consoleRoot 'scripts\package-squirrel.mjs')
        if ($LASTEXITCODE -ne 0) { throw "package-squirrel.mjs exited $LASTEXITCODE" }
    } finally { Pop-Location }

    Phase ("Delivery build complete in {0:c}." -f ([DateTimeOffset]::UtcNow - $started))
    exit 0
} catch {
    Write-Error "Delivery build failed after $(([DateTimeOffset]::UtcNow - $started).ToString('c')): $($_.Exception.Message)"
    exit 1
}
