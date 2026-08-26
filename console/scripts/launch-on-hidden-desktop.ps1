<#
.SYNOPSIS
Starts a process on a named off-screen Windows desktop and prints its process id.

.DESCRIPTION
A design-parity capture has to drive a real GUI — the design's own runtime in a browser, and
the built renderer under Electron — without any of it appearing on the visible desktop,
stealing focus, or moving the pointer. Windows already supports exactly that: a process
launched with STARTUPINFO.lpDesktop set runs on a desktop of its own that is never switched
to. Its windows are real, enumerable and capturable; they are simply not on the desktop
anybody is looking at.

This is a launcher and nothing else. It never switches to the desktop it creates, never
sends input, and never closes anything. The caller drives the launched process over its own
loopback debugging port.

.PARAMETER Desktop
Name of the off-screen desktop. Created if it does not already exist.

.PARAMETER FilePath
Absolute path to the executable.

.PARAMETER Arguments
The command line arguments, as one string.

.EXAMPLE
pwsh -NoProfile -ExecutionPolicy Bypass -File console/scripts/launch-on-hidden-desktop.ps1 `
  -Desktop DingParity -FilePath 'C:\...\msedge.exe' -Arguments '--headless ...'
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Desktop,
  [Parameter(Mandatory = $true)][string]$FilePath,
  [string]$WorkingDirectory = '',
  # Usable directly from PowerShell, where a quoted string survives intact.
  [string]$Arguments = '',
  # The route for every other caller. A browser flag list is a long string full of spaces
  # whose every token starts with '-', so passing it through a non-PowerShell shell loses a
  # fight on two fronts at once: the shell's own quoting, and PowerShell binding each '-flag'
  # as a parameter name of its own. A file has neither problem. Its contents are used verbatim
  # as the command-line tail.
  [string]$ArgumentsFile = ''
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "launch-on-hidden-desktop: '$FilePath' does not exist"
}

Add-Type -Namespace DingParity -Name Native -MemberDefinition @"
[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct STARTUPINFO {
  public int cb;
  public string lpReserved;
  public string lpDesktop;
  public string lpTitle;
  public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
  public short wShowWindow, cbReserved2;
  public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
}

[StructLayout(LayoutKind.Sequential)]
public struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId; }

[DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
public static extern IntPtr CreateDesktop(string lpszDesktop, IntPtr lpszDevice, IntPtr pDevmode, int dwFlags, uint dwDesiredAccess, IntPtr lpsa);

[DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
public static extern bool CreateProcess(string lpApplicationName, string lpCommandLine, IntPtr lpProcessAttributes,
  IntPtr lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment,
  string lpCurrentDirectory, ref STARTUPINFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool CloseHandle(IntPtr hObject);
"@

# GENERIC_ALL on a desktop object. Opened once and deliberately leaked for the life of this
# process: Windows destroys a desktop as soon as the last handle to it closes AND no process
# is running on it, and the launched process has not started yet at this point.
$desktopHandle = [DingParity.Native]::CreateDesktop($Desktop, [IntPtr]::Zero, [IntPtr]::Zero, 0, 0x10000000, [IntPtr]::Zero)
if ($desktopHandle -eq [IntPtr]::Zero) {
  throw "launch-on-hidden-desktop: CreateDesktop('$Desktop') failed with Win32 error $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())"
}

$startupInfo = New-Object DingParity.Native+STARTUPINFO
$startupInfo.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($startupInfo)
$startupInfo.lpDesktop = $Desktop

$processInformation = New-Object DingParity.Native+PROCESS_INFORMATION
# CREATE_NEW_CONSOLE (0x10) keeps a console-spawning child off this shell's console.
if ($ArgumentsFile) {
  if (-not (Test-Path -LiteralPath $ArgumentsFile)) { throw "launch-on-hidden-desktop: -ArgumentsFile '$ArgumentsFile' does not exist" }
  $Arguments = (Get-Content -LiteralPath $ArgumentsFile -Raw).Trim()
}
$commandLine = '"' + $FilePath + '" ' + $Arguments
$created = [DingParity.Native]::CreateProcess($FilePath, $commandLine, [IntPtr]::Zero, [IntPtr]::Zero, $false, 0x10,
  [IntPtr]::Zero, $(if ($WorkingDirectory) { $WorkingDirectory } else { Split-Path -Parent $FilePath }), [ref]$startupInfo, [ref]$processInformation)
if (-not $created) {
  throw "launch-on-hidden-desktop: CreateProcess failed with Win32 error $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())"
}

[void][DingParity.Native]::CloseHandle($processInformation.hThread)
[void][DingParity.Native]::CloseHandle($processInformation.hProcess)
Write-Output ("PID=" + $processInformation.dwProcessId + " DESKTOP=" + $Desktop)
