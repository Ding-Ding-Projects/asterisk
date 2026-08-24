[CmdletBinding()]
param(
    [ValidateSet('wsl', 'docker', 'host', 'all')]
    [string]$Mode = 'all',
    [string]$ApprovedHost = '',
    [int]$ApprovedPort = 22,
    [string]$ApprovedUser = '',
    [string]$KnownHostsPath = '',
    [string]$InventoryPath = '',
    [long]$MinimumMemoryBytes = 2147483648,
    [long]$MinimumStorageBytes = 8589934592,
    [int]$RequiredPort = 8088
)

$ErrorActionPreference = 'Stop'

function Invoke-ReadOnly([string]$Executable, [string[]]$Arguments) {
    $output = @(& $Executable @Arguments 2>&1)
    [pscustomobject]@{
        executable = $Executable
        arguments = $Arguments
        exitCode = $LASTEXITCODE
        output = ($output -join "`n")
    }
}

function Add-Check([System.Collections.IDictionary]$Owner, [string]$Name, [bool]$Ok, [string]$Detail) {
    if (-not $Owner.Contains('checks')) { $Owner.checks = @() }
    $Owner.checks += [pscustomobject]@{ name = $Name; ok = $Ok; detail = $Detail }
}

$result = [ordered]@{
    schemaVersion = 1
    observedAt = [DateTimeOffset]::UtcNow.ToString('o')
    mode = $Mode
    mutation = 'none; this command only reads local or explicitly approved target state'
}

if ($Mode -in @('wsl', 'all')) {
    $result.wsl = @(
        (Invoke-ReadOnly 'wsl.exe' @('--status')),
        (Invoke-ReadOnly 'wsl.exe' @('--version')),
        (Invoke-ReadOnly 'wsl.exe' @('--list', '--verbose')),
        (Invoke-ReadOnly 'wsl.exe' @('--list', '--running', '--verbose'))
    )
}

if ($Mode -in @('docker', 'all')) {
    $dockerProbe = @(
        (Invoke-ReadOnly 'docker' @('version', '--format', '{{json .}}')),
        (Invoke-ReadOnly 'docker' @('info', '--format', '{{json .}}')),
        (Invoke-ReadOnly 'docker' @('ps', '--all', '--format', '{{json .}}')),
        (Invoke-ReadOnly 'docker' @('system', 'df', '--format', '{{json .}}'))
    )
    $result.docker = $dockerProbe
    $info = $dockerProbe[1].output | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($info) {
        Add-Check $result 'docker-linux-engine' ($info.OSType -eq 'linux') "OSType=$($info.OSType)"
        Add-Check $result 'docker-amd64-architecture' ($info.Architecture -in @('x86_64', 'amd64')) "Architecture=$($info.Architecture)"
        Add-Check $result 'docker-memory-threshold' ([long]$info.MemTotal -ge $MinimumMemoryBytes) "Memory=$($info.MemTotal) required=$MinimumMemoryBytes"
    } else { Add-Check $result 'docker-info-readable' $false 'Docker info was not valid JSON.' }
    $portConflict = @(Get-NetTCPConnection -State Listen -LocalPort $RequiredPort -ErrorAction SilentlyContinue)
    Add-Check $result 'local-port-available' ($portConflict.Count -eq 0) "Port $RequiredPort listeners=$($portConflict.Count)"
    $drive = Get-PSDrive -Name ((Get-Location).Path.Substring(0, 1)) -ErrorAction SilentlyContinue
    Add-Check $result 'local-storage-threshold' ([long]$drive.Free -ge $MinimumStorageBytes) "FreeStorage=$($drive.Free) required=$MinimumStorageBytes"
}

if ($Mode -in @('host', 'all') -and -not [string]::IsNullOrWhiteSpace($ApprovedHost)) {
    if ([string]::IsNullOrWhiteSpace($ApprovedUser)) { throw '-ApprovedUser is required with -ApprovedHost.' }
    if ([string]::IsNullOrWhiteSpace($KnownHostsPath)) { throw '-KnownHostsPath is required with -ApprovedHost.' }
    if ([string]::IsNullOrWhiteSpace($InventoryPath)) { throw '-InventoryPath is required with -ApprovedHost.' }
    if (-not (Test-Path -LiteralPath $KnownHostsPath)) { throw "Known-hosts file does not exist: $KnownHostsPath" }
    $inventory = Get-Content -Raw -LiteralPath $InventoryPath | ConvertFrom-Json
    if ($inventory.schemaVersion -ne 1 -or -not $inventory.hosts) { throw 'The private host inventory must have schemaVersion 1 and a hosts array.' }
    $approved = @($inventory.hosts | Where-Object { $_.host -eq $ApprovedHost -and [int]$_.port -eq $ApprovedPort -and $_.user -eq $ApprovedUser })
    if ($approved.Count -ne 1) { throw 'The host, port, and user tuple is not an exact entry in the private inventory.' }
    if ($approved[0].knownHostsPath -and [System.IO.Path]::GetFullPath($approved[0].knownHostsPath) -ne [System.IO.Path]::GetFullPath($KnownHostsPath)) { throw 'The supplied known-hosts path does not match the private inventory entry.' }
    $remote = 'uname -a; printf "ARCH="; uname -m; printf "CPUS="; nproc; printf "MEMORY="; awk ''/MemTotal:/{print $2*1024}'' /proc/meminfo; printf "DISK="; df -P -B1 /; printf "PORTS="; ss -ltn; printf "DOCKER="; docker info --format ''{{json .}}''; printf "WORKLOADS="; docker ps --all --format ''{{json .}}'''
    $sshArgs = @(
        '-T', '-p', [string]$ApprovedPort,
        '-o', 'BatchMode=yes',
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'UpdateHostKeys=no',
        '-o', "UserKnownHostsFile=$KnownHostsPath",
        '-o', 'ConnectTimeout=10',
        "$ApprovedUser@$ApprovedHost",
        'sh', '-c', $remote
    )
    $hostProbe = Invoke-ReadOnly 'ssh' $sshArgs
    $result.approvedHost = [ordered]@{
        host = $ApprovedHost
        port = $ApprovedPort
        user = $ApprovedUser
        probe = $hostProbe
        scope = 'read-only capacity, architecture, Docker info, and workload inventory only'
    }
    Add-Check $result 'private-inventory-exact-match' $true "$ApprovedUser@$ApprovedHost`:$ApprovedPort"
    Add-Check $result 'private-inventory-architecture' ($approved[0].architecture -in @('x86_64', 'amd64')) "Expected architecture=$($approved[0].architecture)"
    Add-Check $result 'private-inventory-memory-threshold' ([long]$approved[0].minimumMemoryBytes -ge $MinimumMemoryBytes) "Minimum memory=$($approved[0].minimumMemoryBytes) required=$MinimumMemoryBytes"
    Add-Check $result 'private-inventory-storage-threshold' ([long]$approved[0].minimumStorageBytes -ge $MinimumStorageBytes) "Minimum storage=$($approved[0].minimumStorageBytes) required=$MinimumStorageBytes"
    Add-Check $result 'private-inventory-port' (@($approved[0].allowedPorts) -contains $RequiredPort) "Required port=$RequiredPort"
    $actualArch = [regex]::Match($hostProbe.output, 'ARCH=(?<value>[^\r\n]+)').Groups['value'].Value.Trim()
    $actualMemory = [long]([regex]::Match($hostProbe.output, 'MEMORY=(?<value>[0-9]+)').Groups['value'].Value)
    Add-Check $result 'approved-host-architecture-observed' ($actualArch -in @('x86_64', 'amd64')) "Observed architecture=$actualArch"
    Add-Check $result 'approved-host-memory-observed' ($actualMemory -ge $MinimumMemoryBytes) "Observed memory=$actualMemory required=$MinimumMemoryBytes"
    Add-Check $result 'approved-host-port-conflict' (-not ($hostProbe.output -match "[:.]$RequiredPort\b")) "Port $RequiredPort listener check"
    Add-Check $result 'approved-host-workload-inventory' ($hostProbe.output -notmatch 'WORKLOADS=.*ding-pbx-control-plane') 'No existing managed workload conflict was observed.'
} elseif ($Mode -eq 'host') {
    throw '-Mode host requires an explicitly approved host, user, and persistent known-hosts path.'
}

$result | ConvertTo-Json -Depth 8
