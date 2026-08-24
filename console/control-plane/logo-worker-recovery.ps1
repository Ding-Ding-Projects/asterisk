param(
  [Parameter(Mandatory = $true)][string]$RecoveryPath
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class LogoWorkerRecoveryProfile {
  [DllImport("userenv.dll")] static extern int DeleteAppContainerProfile(string name);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint code);
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  public static void Delete(string name) { if (!String.IsNullOrEmpty(name)) { var result = DeleteAppContainerProfile(name); if (result != 0 && result != unchecked((int)0x80070002)) throw new InvalidOperationException("DeleteAppContainerProfile failed: " + result); } }
  public static void Terminate(int pid) { var handle = OpenProcess(0x0001u, false, pid); if (handle == IntPtr.Zero) return; try { if (!TerminateProcess(handle, 125)) throw new InvalidOperationException("TerminateProcess failed"); } finally { CloseHandle(handle); } }
}
"@

function Get-TextHash([string]$Text) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
}

function Get-FileDigest([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

try {
  if (-not [IO.File]::Exists($RecoveryPath)) { throw "The decoder recovery record is missing: $RecoveryPath" }
  $record = Get-Content -Raw -LiteralPath $RecoveryPath | ConvertFrom-Json
  if ($record.schemaVersion -ne 1 -or [string]::IsNullOrWhiteSpace([string]$record.recoveryNonce) -or [string]::IsNullOrWhiteSpace([string]$record.supervisorPath) -or [string]::IsNullOrWhiteSpace([string]$record.supervisorStartToken) -or [string]::IsNullOrWhiteSpace([string]$record.supervisorCreationTime) -or [string]::IsNullOrWhiteSpace([string]$record.supervisorCommandHash) -or [string]::IsNullOrWhiteSpace([string]$record.recoveryScriptPath) -or [string]::IsNullOrWhiteSpace([string]$record.recoveryScriptHash) -or [string]::IsNullOrWhiteSpace([string]$record.workerPath) -or [string]::IsNullOrWhiteSpace([string]$record.nodePath) -or [string]::IsNullOrWhiteSpace([string]$record.workerCommandHash)) { throw 'The decoder recovery record is incomplete.' }
  if ([IO.Path]::GetFullPath([string]$record.recoveryScriptPath) -ne [IO.Path]::GetFullPath($PSCommandPath) -or (Get-FileDigest $PSCommandPath) -ne [string]$record.recoveryScriptHash) { throw 'The decoder recovery helper identity does not match the recorded run.' }
  $supervisorPid = [int]$record.supervisorPid
  $supervisor = Get-CimInstance Win32_Process -Filter "ProcessId = $supervisorPid" -ErrorAction SilentlyContinue
  $supervisorLive = $null -ne $supervisor
  if ($supervisorLive) {
    if ([IO.Path]::GetFullPath([string]$supervisor.ExecutablePath) -ne [IO.Path]::GetFullPath([string]$record.supervisorPath)) { throw 'The recorded supervisor identity does not match the live process.' }
    $startToken = (Get-Process -Id $supervisorPid -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')
    if ($startToken -ne [string]$record.supervisorStartToken) { throw 'The recorded supervisor start token does not match the live process.' }
    $creationTime = ([System.Management.ManagementDateTimeConverter]::ToDateTime([string]$supervisor.CreationDate)).ToUniversalTime().ToString('o')
    if ($creationTime -ne [string]$record.supervisorCreationTime) { throw 'The recorded supervisor creation time does not match the live process.' }
    if ((Get-TextHash ([string]$supervisor.CommandLine)) -ne [string]$record.supervisorCommandHash) { throw 'The recorded supervisor command identity does not match the live process.' }
  }
  $workerPid = [int]$record.workerPid
  if ($workerPid -le 0) { throw 'The recovery record has no worker identity.' }
  $worker = Get-CimInstance Win32_Process -Filter "ProcessId = $workerPid" -ErrorAction SilentlyContinue
  $workerLive = $null -ne $worker
  if ($workerLive) {
    if ([IO.Path]::GetFullPath([string]$worker.ExecutablePath) -ne [IO.Path]::GetFullPath([string]$record.nodePath) -or -not ([string]$worker.CommandLine).Contains([string]$record.workerPath, [StringComparison]::OrdinalIgnoreCase)) { throw 'The recorded worker identity does not match the live process.' }
    $commandBytes = [Text.Encoding]::UTF8.GetBytes([string]$worker.CommandLine)
    $commandHash = ([BitConverter]::ToString(([Security.Cryptography.SHA256]::Create()).ComputeHash($commandBytes))).Replace('-', '').ToLowerInvariant()
    if ($commandHash -ne [string]$record.workerCommandHash) { throw 'The recorded worker command identity does not match the live process.' }
  }
  if ($supervisorLive) { [IO.File]::WriteAllText($RecoveryPath + '.cancel', [string]$record.recoveryNonce, [Text.Encoding]::UTF8) }
  if (-not $supervisorLive -and $workerLive) { [LogoWorkerRecoveryProfile]::Terminate($workerPid) }
  $deadline = [DateTime]::UtcNow.AddSeconds(3)
  while ([DateTime]::UtcNow -lt $deadline -and (Get-Process -Id $supervisorPid -ErrorAction SilentlyContinue)) { Start-Sleep -Milliseconds 50 }
  if (Get-Process -Id $supervisorPid -ErrorAction SilentlyContinue) { [LogoWorkerRecoveryProfile]::Terminate($supervisorPid) }
  $deadline = [DateTime]::UtcNow.AddSeconds(3)
  while ([DateTime]::UtcNow -lt $deadline -and (Get-Process -Id $workerPid -ErrorAction SilentlyContinue)) { Start-Sleep -Milliseconds 50 }
  if (Get-Process -Id $workerPid -ErrorAction SilentlyContinue) { throw 'The identity-bound worker did not terminate during recovery.' }
  $workerExitObserved = $true
  $aclRestored = $true
  foreach ($item in @($record.acl)) {
    if ([IO.File]::Exists($item.path) -or [IO.Directory]::Exists($item.path)) {
      $acl = New-Object System.Security.AccessControl.DirectorySecurity
      if ([IO.File]::Exists($item.path)) { $acl = New-Object System.Security.AccessControl.FileSecurity }
      $acl.SetSecurityDescriptorSddlForm([string]$item.sddl)
      Set-Acl -LiteralPath $item.path -AclObject $acl
      if ((Get-Acl -LiteralPath $item.path).Sddl -ne [string]$item.sddl) { throw ('The decoder ACL restore could not be independently verified: ' + [string]$item.path) }
    }
  }
  [LogoWorkerRecoveryProfile]::Delete([string]$record.profileName)
  $profileDeleted = $true
  Remove-Item -LiteralPath $RecoveryPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath ($RecoveryPath + '.cancel') -Force -ErrorAction SilentlyContinue
  $receipt = [ordered]@{ type = 'RECOVERY_COMPLETE'; recoveryNonce = [string]$record.recoveryNonce; workerExitObserved = $workerExitObserved; aclRestored = $aclRestored; profileDeleted = $profileDeleted; recordRemoved = -not (Test-Path -LiteralPath $RecoveryPath); noOrphan = -not (Get-Process -Id $workerPid -ErrorAction SilentlyContinue) -and -not (Get-Process -Id $supervisorPid -ErrorAction SilentlyContinue) }
  $receipt | ConvertTo-Json -Compress
  exit 0
} catch {
  Write-Error $_
  exit 1
}
