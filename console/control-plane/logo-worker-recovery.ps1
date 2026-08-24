param(
  [Parameter(Mandatory = $true)][string]$RecoveryPath
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class LogoWorkerRecoveryProfile {
  [DllImport("userenv.dll")] static extern int DeleteAppContainerProfile(string name);
  public static void Delete(string name) { if (!String.IsNullOrEmpty(name)) { var result = DeleteAppContainerProfile(name); if (result != 0 && result != unchecked((int)0x80070002)) throw new InvalidOperationException("DeleteAppContainerProfile failed: " + result); } }
}
"@

try {
  if (-not [IO.File]::Exists($RecoveryPath)) { throw "The decoder recovery record is missing: $RecoveryPath" }
  $record = Get-Content -Raw -LiteralPath $RecoveryPath | ConvertFrom-Json
  $supervisorPid = [int]$record.supervisorPid
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $supervisorPid" -ErrorAction SilentlyContinue
  foreach ($child in @($children)) { Stop-Process -Id ([int]$child.ProcessId) -Force -ErrorAction SilentlyContinue }
  if ($supervisorPid -gt 0) { Stop-Process -Id $supervisorPid -Force -ErrorAction SilentlyContinue }
  foreach ($item in @($record.acl)) {
    if ([IO.File]::Exists($item.path) -or [IO.Directory]::Exists($item.path)) {
      $acl = New-Object System.Security.AccessControl.DirectorySecurity
      if ([IO.File]::Exists($item.path)) { $acl = New-Object System.Security.AccessControl.FileSecurity }
      $acl.SetSecurityDescriptorSddlForm([string]$item.sddl)
      Set-Acl -LiteralPath $item.path -AclObject $acl
    }
  }
  [LogoWorkerRecoveryProfile]::Delete([string]$record.profileName)
  Remove-Item -LiteralPath $RecoveryPath -Force -ErrorAction SilentlyContinue
  Write-Output 'RECOVERY_COMPLETE'
  exit 0
} catch {
  Write-Error $_
  exit 1
}
