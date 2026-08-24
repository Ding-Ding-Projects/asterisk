[CmdletBinding()]
param(
    [ValidateSet('wsl', 'docker', 'host', 'all')]
    [string]$Mode = 'all',
    [string]$ApprovedHost = '',
    [int]$ApprovedPort = 22,
    [string]$ApprovedUser = '',
    [string]$KnownHostsPath = ''
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
    $result.docker = @(
        (Invoke-ReadOnly 'docker' @('version', '--format', '{{json .}}')),
        (Invoke-ReadOnly 'docker' @('info', '--format', '{{json .}}')),
        (Invoke-ReadOnly 'docker' @('ps', '--all', '--format', '{{json .}}')),
        (Invoke-ReadOnly 'docker' @('system', 'df', '--format', '{{json .}}'))
    )
}

if ($Mode -in @('host', 'all') -and -not [string]::IsNullOrWhiteSpace($ApprovedHost)) {
    if ([string]::IsNullOrWhiteSpace($ApprovedUser)) { throw '-ApprovedUser is required with -ApprovedHost.' }
    if ([string]::IsNullOrWhiteSpace($KnownHostsPath)) { throw '-KnownHostsPath is required with -ApprovedHost.' }
    if (-not (Test-Path -LiteralPath $KnownHostsPath)) { throw "Known-hosts file does not exist: $KnownHostsPath" }
    $remote = 'uname -a; printf "ARCH="; uname -m; printf "CPUS="; nproc; printf "MEMORY="; awk ''/MemTotal:/{print $2*1024}'' /proc/meminfo; printf "DISK="; df -P -B1 /; printf "DOCKER="; docker info --format ''{{json .}}''; printf "WORKLOADS="; docker ps --all --format ''{{json .}}'''
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
    $result.approvedHost = [ordered]@{
        host = $ApprovedHost
        port = $ApprovedPort
        user = $ApprovedUser
        probe = Invoke-ReadOnly 'ssh' $sshArgs
        scope = 'read-only capacity, architecture, Docker info, and workload inventory only'
    }
} elseif ($Mode -eq 'host') {
    throw '-Mode host requires an explicitly approved host, user, and persistent known-hosts path.'
}

$result | ConvertTo-Json -Depth 8
