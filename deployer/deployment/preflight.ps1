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
    [int]$RequiredPort = 8088,
    [string]$ProjectName = 'ding-pbx-control-plane',
    [string]$BindAddress = '127.0.0.1',
    [int]$EvidenceExpiresMinutes = 15
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

function Convert-JsonLines([string]$Text) {
    $items = @()
    $valid = $true
    foreach ($line in @($Text -split "`r?`n" | Where-Object { $_.Trim() })) {
        try { $items += ($line | ConvertFrom-Json -ErrorAction Stop) } catch { $valid = $false }
    }
    [pscustomobject]@{ items = $items; valid = $valid }
}

function Has-DockerLabel($Container, [string]$Name, [string]$Value) {
    $labels = @([string]$Container.Labels -split ',')
    return @($labels | Where-Object { $_ -eq "$Name=$Value" }).Count -eq 1
}

function Get-AvailableStorageBytes($Facts) {
    foreach ($fact in @($Facts)) {
        foreach ($name in @('AvailableBytes', 'FreeBytes', 'Available', 'Free')) {
            $property = $fact.PSObject.Properties[$name]
            if ($null -ne $property -and [long]::TryParse([string]$property.Value, [ref]$value) -and $value -ge 0) { return [long]$value }
        }
    }
    return $null
}
function Test-WorkloadRecord($Container) {
    return $null -ne $Container.ID -and $null -ne $Container.Names -and $null -ne $Container.Image -and $null -ne $Container.State -and $null -ne $Container.Labels
}

function Convert-EngineStorageBytes([string]$Value) {
    $match = [regex]::Match($Value.Trim(), '^(?<number>[0-9]+(?:\.[0-9]+)?)\s*(?<unit>B|kB|MB|GB|TB)$')
    if (-not $match.Success) { return $null }
    $multipliers = @{ B = 1; kB = 1KB; MB = 1MB; GB = 1GB; TB = 1TB }
    return [long]([double]$match.Groups['number'].Value * $multipliers[$match.Groups['unit'].Value])
}

$targetKind = if ($Mode -eq 'host' -or ($Mode -eq 'all' -and $ApprovedHost)) { 'approved-ssh' } else { 'local-docker' }
$targetHost = if ($targetKind -eq 'approved-ssh') { $ApprovedHost } else { 'local' }
$targetUser = if ($targetKind -eq 'approved-ssh') { $ApprovedUser } else { 'local' }
$targetSshPort = if ($targetKind -eq 'approved-ssh') { $ApprovedPort } else { 0 }
$inventoryPathValue = if ($targetKind -eq 'approved-ssh') { $InventoryPath } else { 'local-engine-facts' }

$result = [ordered]@{
    schemaVersion = 1
    observedAt = [DateTimeOffset]::UtcNow.ToString('o')
    mode = $Mode
    projectName = $ProjectName
    requiredPort = $RequiredPort
    bindAddress = $BindAddress
    target = $targetKind
    targetHost = $targetHost
    targetUser = $targetUser
    targetSshPort = $targetSshPort
    inventoryPath = $inventoryPathValue
    expiresAt = [DateTimeOffset]::UtcNow.AddMinutes($EvidenceExpiresMinutes).ToString('o')
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
        (Invoke-ReadOnly 'docker' @('system', 'df', '--format', '{{json .}}')),
        (Invoke-ReadOnly 'docker' @('ps', '--all', '--filter', 'label=io.ding.pbx.project=ding-pbx', '--format', '{{json .}}'))
    )
    $result.docker = $dockerProbe
    $info = $dockerProbe[1].output | ConvertFrom-Json -ErrorAction SilentlyContinue
    $storageFacts = Convert-JsonLines $dockerProbe[3].output
    $result.dockerStorageFacts = $storageFacts.items
    Add-Check $result 'docker-engine-storage-facts-readable' ($dockerProbe[3].exitCode -eq 0 -and $storageFacts.valid -and $storageFacts.items.Count -gt 0) "Docker engine storage fact rows=$($storageFacts.items.Count)"
    if ($info) {
        Add-Check $result 'docker-linux-engine' ($info.OSType -eq 'linux') "OSType=$($info.OSType)"
        Add-Check $result 'docker-amd64-architecture' ($info.Architecture -in @('x86_64', 'amd64')) "Architecture=$($info.Architecture)"
        Add-Check $result 'docker-memory-threshold' ([long]$info.MemTotal -ge $MinimumMemoryBytes) "Memory=$($info.MemTotal) required=$MinimumMemoryBytes"
        $dockerRoot = [string]$info.DockerRootDir
        Add-Check $result 'docker-root-storage-readable' (-not [string]::IsNullOrWhiteSpace($dockerRoot)) "DockerRoot=$dockerRoot; storage is measured from Docker engine facts"
        $availableStorage = $null
        foreach ($row in @($info.DriverStatus)) {
            if (@($row).Count -ge 2 -and [string]$row[0] -match 'Data Space Available|Backing Filesystem Available') { $availableStorage = Convert-EngineStorageBytes ([string]$row[1]) }
        }
        Add-Check $result 'docker-engine-free-storage-threshold' ($null -ne $availableStorage -and $availableStorage -ge $MinimumStorageBytes) "EngineAvailableBytes=$availableStorage required=$MinimumStorageBytes"
    } else { Add-Check $result 'docker-info-readable' $false 'Docker info was not valid JSON.' }
    $portConflict = @(Get-NetTCPConnection -State Listen -LocalPort $RequiredPort -ErrorAction SilentlyContinue)
    Add-Check $result 'local-port-available' ($portConflict.Count -eq 0) "Port $RequiredPort listeners=$($portConflict.Count)"
    $availableStorageBytes = Get-AvailableStorageBytes $storageFacts.items
    Add-Check $result 'local-storage-threshold' ($storageFacts.valid -and $null -ne $availableStorageBytes -and $availableStorageBytes -ge $MinimumStorageBytes) "AvailableBytes=$availableStorageBytes required=$MinimumStorageBytes"
    $workloadOutput = $dockerProbe[2].output
    Add-Check $result 'local-workload-inventory-readable' ($dockerProbe[2].exitCode -eq 0) 'Every local container was enumerated.'
    $workloads = Convert-JsonLines $workloadOutput
    $managedConflict = @($workloads.items | Where-Object { Has-DockerLabel $_ 'io.ding.pbx.project' 'ding-pbx-control-plane' }).Count -gt 0
    Add-Check $result 'local-managed-workload-conflict' (-not $managedConflict) 'No existing managed workload conflict was observed.'
    Add-Check $result 'local-workload-json-lines' ($workloads.valid -and $dockerProbe[2].exitCode -eq 0) "Parsed workload JSON lines=$($workloads.items.Count)"
    Add-Check $result 'local-workload-record-shape' (@($workloads.items | Where-Object { -not (Test-WorkloadRecord $_) }).Count -eq 0) 'Every local workload record carries ID, name, image, state, and labels.'
}

if ($Mode -in @('host', 'all') -and -not [string]::IsNullOrWhiteSpace($ApprovedHost)) {
    if ([string]::IsNullOrWhiteSpace($ApprovedUser)) { throw '-ApprovedUser is required with -ApprovedHost.' }
    if ([string]::IsNullOrWhiteSpace($KnownHostsPath)) { throw '-KnownHostsPath is required with -ApprovedHost.' }
    if ([string]::IsNullOrWhiteSpace($InventoryPath)) { throw '-InventoryPath is required with -ApprovedHost.' }
    if (-not (Test-Path -LiteralPath $KnownHostsPath)) { throw "Known-hosts file does not exist: $KnownHostsPath" }
    if (-not [System.IO.Path]::IsPathRooted($KnownHostsPath)) { throw 'Known-hosts path must be absolute and persistent.' }
    $knownHostsAcl = Get-Acl -LiteralPath $KnownHostsPath
    if ([string]::IsNullOrWhiteSpace([string]$knownHostsAcl.Owner)) { throw 'Known-hosts file has no readable owner ACL.' }
    if (@($knownHostsAcl.Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -match 'Everyone|BUILTIN\\Users|Authenticated Users' }).Count -gt 0) { throw 'Known-hosts file is readable by a broad group and is not protected.' }
    $inventory = Get-Content -Raw -LiteralPath $InventoryPath | ConvertFrom-Json
    if ($inventory.schemaVersion -ne 1 -or -not $inventory.hosts) { throw 'The private host inventory must have schemaVersion 1 and a hosts array.' }
    $approved = @($inventory.hosts | Where-Object { $_.host -eq $ApprovedHost -and [int]$_.port -eq $ApprovedPort -and $_.user -eq $ApprovedUser })
    if ($approved.Count -ne 1) { throw 'The host, port, and user tuple is not an exact entry in the private inventory.' }
    if ($approved[0].knownHostsPath -and [System.IO.Path]::GetFullPath($approved[0].knownHostsPath) -ne [System.IO.Path]::GetFullPath($KnownHostsPath)) { throw 'The supplied known-hosts path does not match the private inventory entry.' }
    $remote = 'uname -a; printf "ARCH="; uname -m; printf "CPUS="; nproc; printf "MEMORY="; awk ''/MemTotal:/{print $2*1024}'' /proc/meminfo; printf "FREE_BYTES="; df -P -B1 --output=avail / | tail -1; printf "PORTS="; ss -ltn; printf "DOCKER="; docker info --format ''{{json .}}''; printf "WORKLOADS="; docker ps --all --format ''{{json .}}'''
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
    Add-Check $result 'ssh-exit-zero' ($hostProbe.exitCode -eq 0) "SSH exit code=$($hostProbe.exitCode)"
    Add-Check $result 'private-inventory-architecture' ($approved[0].architecture -in @('x86_64', 'amd64')) "Expected architecture=$($approved[0].architecture)"
    Add-Check $result 'private-inventory-memory-threshold' ([long]$approved[0].minimumMemoryBytes -ge $MinimumMemoryBytes) "Minimum memory=$($approved[0].minimumMemoryBytes) required=$MinimumMemoryBytes"
    Add-Check $result 'private-inventory-storage-threshold' ([long]$approved[0].minimumStorageBytes -ge $MinimumStorageBytes) "Minimum storage=$($approved[0].minimumStorageBytes) required=$MinimumStorageBytes"
    Add-Check $result 'private-inventory-port' (@($approved[0].allowedPorts) -contains $RequiredPort) "Required port=$RequiredPort"
    $actualArch = [regex]::Match($hostProbe.output, 'ARCH=(?<value>[^\r\n]+)').Groups['value'].Value.Trim()
    $actualMemory = [long]([regex]::Match($hostProbe.output, 'MEMORY=(?<value>[0-9]+)').Groups['value'].Value)
    $actualFreeBytes = [long]([regex]::Match($hostProbe.output, 'FREE_BYTES=(?<value>[0-9]+)').Groups['value'].Value)
    Add-Check $result 'approved-host-architecture-observed' ($actualArch -in @('x86_64', 'amd64')) "Observed architecture=$actualArch"
    Add-Check $result 'approved-host-memory-observed' ($actualMemory -ge $MinimumMemoryBytes) "Observed memory=$actualMemory required=$MinimumMemoryBytes"
    Add-Check $result 'approved-host-storage-observed' ($actualFreeBytes -ge $MinimumStorageBytes) "Observed free bytes=$actualFreeBytes required=$MinimumStorageBytes"
    Add-Check $result 'approved-host-port-conflict' (-not ($hostProbe.output -match "[:.]$RequiredPort\b")) "Port $RequiredPort listener check"
    $workloadMarker = $hostProbe.output.IndexOf('WORKLOADS=', [StringComparison]::Ordinal)
    $hostWorkloadText = if ($workloadMarker -ge 0) { $hostProbe.output.Substring($workloadMarker + 10) } else { '' }
    $hostWorkloads = Convert-JsonLines $hostWorkloadText
    $hostManagedConflict = @($hostWorkloads.items | Where-Object { Has-DockerLabel $_ 'io.ding.pbx.project' 'ding-pbx-control-plane' }).Count -gt 0
    Add-Check $result 'approved-host-workload-inventory' (-not $hostManagedConflict) 'No existing managed workload conflict was observed.'
    Add-Check $result 'approved-host-workload-json-lines' ($hostWorkloads.valid -and $workloadMarker -ge 0) "Parsed workload JSON lines=$($hostWorkloads.items.Count)"
    Add-Check $result 'approved-host-workload-record-shape' (@($hostWorkloads.items | Where-Object { -not (Test-WorkloadRecord $_) }).Count -eq 0) 'Every approved-host workload record carries ID, name, image, state, and labels.'
} elseif ($Mode -eq 'host') {
    throw '-Mode host requires an explicitly approved host, user, and persistent known-hosts path.'
}

$result | ConvertTo-Json -Depth 8
