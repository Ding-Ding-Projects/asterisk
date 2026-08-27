[CmdletBinding()]
param([switch]$Silent)

$ErrorActionPreference = 'Stop'
$started = [DateTimeOffset]::UtcNow
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $repoRoot 'dependency-manifest.json'

function Write-Phase([string]$Message) {
    Write-Host ("[{0:HH:mm:ss}] {1}" -f [DateTime]::Now, $Message)
}

function Get-Sha256([string]$Path) {
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
    } finally {
        $algorithm.Dispose()
        $stream.Dispose()
    }
}

function Fail([string]$Dependency, [string]$Constraint, [string]$Source, [string]$Reason) {
    Write-Error "Dependency '$Dependency' ($Constraint) could not be obtained from '$Source': $Reason"
    exit 1
}

try {
    Write-Phase 'Reading the pinned dependency manifest.'
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        Fail 'dependency manifest' 'schemaVersion 1' $manifestPath 'file is missing'
    }
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    if ($manifest.schemaVersion -ne 1) {
        Fail 'dependency manifest' 'schemaVersion 1' $manifestPath "unsupported schemaVersion $($manifest.schemaVersion)"
    }

    $node = @($manifest.dependencies | Where-Object id -eq 'node-win-x64')
    if ($node.Count -ne 1) {
        Fail 'Node.js' 'one exact node-win-x64 record' $manifestPath "found $($node.Count) records"
    }
    $node = $node[0]
    if ($node.sha256 -notmatch '^[0-9a-f]{64}$') {
        Fail 'Node.js' "version $($node.version)" $node.source 'manifest SHA-256 is malformed'
    }

    $toolchainRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'DingPBX\toolchains'
    $nodeRoot = Join-Path $toolchainRoot $node.archiveRoot
    $nodeExe = Join-Path $nodeRoot 'node.exe'
    $npmCmd = Join-Path $nodeRoot 'npm.cmd'
    $cacheRoot = Join-Path $toolchainRoot 'downloads'
    $archive = Join-Path $cacheRoot (Split-Path -Leaf $node.source)
    New-Item -ItemType Directory -Force -Path $toolchainRoot,$cacheRoot | Out-Null

    $usable = (Test-Path -LiteralPath $nodeExe -PathType Leaf) -and (Test-Path -LiteralPath $npmCmd -PathType Leaf)
    if ($usable) {
        $actual = (& $nodeExe --version).TrimStart('v')
        if ($actual -ne [string]$node.version) {
            Write-Phase "Cached Node.js reports $actual; pinned version is $($node.version), so it will be replaced."
            $usable = $false
        }
    }

    if (-not $usable) {
        Write-Phase "Obtaining Node.js $($node.version) from the canonical Node.js release service."
        $download = $true
        if (Test-Path -LiteralPath $archive -PathType Leaf) {
            $cachedHash = Get-Sha256 $archive
            $download = $cachedHash -ne $node.sha256
            if ($download) { Remove-Item -LiteralPath $archive -Force }
        }
        if ($download) {
            try { Invoke-WebRequest -UseBasicParsing -Uri $node.source -OutFile $archive }
            catch { Fail 'Node.js' "version $($node.version)" $node.source $_.Exception.Message }
        }
        $actualHash = Get-Sha256 $archive
        if ($actualHash -ne $node.sha256) {
            Fail 'Node.js' "SHA-256 $($node.sha256)" $node.source "received SHA-256 $actualHash"
        }
        $extractRoot = Join-Path $toolchainRoot ('.extract-' + [Guid]::NewGuid().ToString('N'))
        try {
            Expand-Archive -LiteralPath $archive -DestinationPath $extractRoot -Force
            $expanded = Join-Path $extractRoot $node.archiveRoot
            if (-not (Test-Path -LiteralPath (Join-Path $expanded 'node.exe') -PathType Leaf)) {
                Fail 'Node.js' "version $($node.version)" $node.source 'archive did not contain node.exe at the declared root'
            }
            if (Test-Path -LiteralPath $nodeRoot) { Remove-Item -LiteralPath $nodeRoot -Recurse -Force }
            Move-Item -LiteralPath $expanded -Destination $nodeRoot
        } finally {
            if (Test-Path -LiteralPath $extractRoot) { Remove-Item -LiteralPath $extractRoot -Recurse -Force }
        }
        Write-Phase "Installed Node.js to $nodeRoot."
    } else {
        Write-Phase "Reusing verified Node.js $($node.version) at $nodeRoot."
    }

    $env:PATH = "$nodeRoot;$env:PATH"
    $gh = @($manifest.dependencies | Where-Object id -eq 'github-cli-win-x64')
    if ($gh.Count -ne 1) { Fail 'GitHub CLI' 'one exact github-cli-win-x64 record' $manifestPath "found $($gh.Count) records" }
    $gh = $gh[0]
    if ($gh.sha256 -notmatch '^[0-9a-f]{64}$') { Fail 'GitHub CLI' "version $($gh.version)" $gh.source 'manifest SHA-256 is malformed' }
    if ($gh.archiveSha256 -notmatch '^[0-9a-f]{64}$') { Fail 'GitHub CLI' "version $($gh.version)" $gh.source 'manifest archiveSha256 is missing or malformed; archive verification is required before extraction' }
    $ghRoot = Join-Path $toolchainRoot ("github-cli-{0}" -f $gh.version)
    $ghExe = Join-Path $ghRoot 'bin\gh.exe'
    $ghArchive = Join-Path $cacheRoot (Split-Path -Leaf $gh.source)
    New-Item -ItemType Directory -Force -Path $ghRoot | Out-Null
    if (-not (Test-Path -LiteralPath $ghExe -PathType Leaf) -or (Get-Sha256 $ghExe) -ne $gh.sha256) {
        if (-not (Test-Path -LiteralPath $ghArchive -PathType Leaf)) {
            try { Invoke-WebRequest -UseBasicParsing -Uri $gh.source -OutFile $ghArchive }
            catch { Fail 'GitHub CLI' "version $($gh.version)" $gh.source $_.Exception.Message }
        }
        $archiveHash = Get-Sha256 $ghArchive
        if ($archiveHash -ne $gh.archiveSha256.ToLowerInvariant()) {
            Fail 'GitHub CLI' "archive SHA-256 $($gh.archiveSha256)" $gh.source "received archive SHA-256 $archiveHash"
        }
        $ghExtract = Join-Path $toolchainRoot ('.gh-extract-' + [Guid]::NewGuid().ToString('N'))
        try {
            Expand-Archive -LiteralPath $ghArchive -DestinationPath $ghExtract -Force
            $candidate = Get-ChildItem -LiteralPath $ghExtract -Filter gh.exe -File -Recurse | Select-Object -First 1
            if (-not $candidate) { Fail 'GitHub CLI' "version $($gh.version)" $gh.source 'archive did not contain gh.exe' }
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ghExe) | Out-Null
            Copy-Item -LiteralPath $candidate.FullName -Destination $ghExe -Force
        } finally { if (Test-Path -LiteralPath $ghExtract) { Remove-Item -LiteralPath $ghExtract -Recurse -Force } }
    }
    if ((Get-Sha256 $ghExe) -ne $gh.sha256) { Fail 'GitHub CLI' "SHA-256 $($gh.sha256)" $gh.source "received SHA-256 $(Get-Sha256 $ghExe)" }
    $forgeResource = Join-Path $repoRoot 'console\resources\forge'
    New-Item -ItemType Directory -Force -Path $forgeResource | Out-Null
    Copy-Item -LiteralPath $ghExe -Destination (Join-Path $forgeResource 'gh.exe') -Force
    $helper = @($manifest.dependencies | Where-Object id -eq 'forge-conpty-helper')
    if ($helper.Count -ne 1) { Fail 'Forge ConPTY helper' 'one exact forge-conpty-helper record' $manifestPath "found $($helper.Count) records" }
    $helper = $helper[0]
    $helperSource = Join-Path $repoRoot $helper.source
    if ((Get-Sha256 $helperSource) -ne $helper.sha256) { Fail 'Forge ConPTY helper' "SHA-256 $($helper.sha256)" $helper.source "received SHA-256 $(Get-Sha256 $helperSource)" }
    $consoleRoot = Join-Path $repoRoot 'console'
    $packageJson = Join-Path $consoleRoot 'package.json'
    $lockfile = Join-Path $consoleRoot 'package-lock.json'
    if (-not (Test-Path -LiteralPath $packageJson -PathType Leaf)) {
        Fail 'console project dependencies' 'console/package.json' $packageJson 'manifest is missing'
    }
    if (-not (Test-Path -LiteralPath $lockfile -PathType Leaf)) {
        Fail 'console project dependencies' 'console/package-lock.json' $lockfile 'lockfile is missing; reproducible npm ci is required'
    }

    Write-Phase 'Installing exact console dependencies with npm ci.'
    Push-Location $consoleRoot
    try {
        & $npmCmd ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            Fail 'console project dependencies' 'versions in console/package-lock.json' 'https://registry.npmjs.org/' "npm ci exited $LASTEXITCODE"
        }
    } finally { Pop-Location }

    $elapsed = [DateTimeOffset]::UtcNow - $started
    Write-Phase ("Dependency bootstrap complete in {0:c}." -f $elapsed)
    exit 0
} catch {
    Write-Error "Dependency bootstrap failed after $(([DateTimeOffset]::UtcNow - $started).ToString('c')): $($_.Exception.Message)"
    exit 1
}
