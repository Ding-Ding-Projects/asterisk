[CmdletBinding()]
param(
    [ValidateSet('start','run','status','cancel','validate')]
    [string]$Mode = 'start',
    [Parameter(Mandatory=$true)][string]$StatePath,
    [Parameter(Mandatory=$true)][string]$GhPath,
    [string]$SessionId
)

$ErrorActionPreference = 'Stop'
$MaxOutputBytes = 65536
$TimeoutSeconds = 300
$AuthVariables = @(
    'GH_HOST','GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN',
    'GITLAB_TOKEN','GIT_ASKPASS','GIT_CONFIG_COUNT','GIT_CONFIG_KEY_0','GIT_CONFIG_VALUE_0',
    'GIT_CONFIG_PARAMETERS','GIT_HTTP_EXTRAHEADER','GIT_SSH_COMMAND'
)

function Write-State([hashtable]$State) {
    $parent = Split-Path -Parent $StatePath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $tmp = "$StatePath.$PID.tmp"
    [IO.File]::WriteAllText($tmp, (($State | ConvertTo-Json -Depth 4) + "`n"), [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $tmp -Destination $StatePath -Force
}

function Read-State {
    if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) { return $null }
    try { return Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json } catch { return $null }
}

function Sanitize-Environment {
    foreach ($name in $AuthVariables) { Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue }
    $env:GH_PROMPT_DISABLED = '0'
}

function Assert-Tooling {
    if ($GhPath -notmatch '^(?:[A-Za-z]:[\\/]|\\\\)' -or -not (Test-Path -LiteralPath $GhPath -PathType Leaf)) { throw 'The packaged gh executable is missing.' }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $GhPath).Hash.ToLowerInvariant()
    $expected = $env:DING_FORGE_GH_SHA256
    if ([string]::IsNullOrWhiteSpace($expected) -or $hash -ne $expected.ToLowerInvariant()) { throw 'The packaged gh executable digest is not the approved value.' }
}

function Ensure-ConPtyType {
    if ('DingForge.ConPty' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace DingForge {
  public static class ConPty {
    [StructLayout(LayoutKind.Sequential)] struct COORD { public short X; public short Y; public COORD(short x, short y) { X=x; Y=y; } }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO { public int cb; public string lpReserved; public string lpDesktop; public string lpTitle; public int dwX; public int dwY; public int dwXSize; public int dwYSize; public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute; public int dwFlags; public short wShowWindow; public short cbReserved2; public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError; }
    [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }
    const int EXTENDED_STARTUPINFO_PRESENT=0x00080000, CREATE_UNICODE_ENVIRONMENT=0x00000400, PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE=0x00020016;
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool CreatePipe(out SafeFileHandle read, out SafeFileHandle write, IntPtr attrs, int size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetHandleInformation(SafeFileHandle handle, int mask, int flags);
    [DllImport("kernel32.dll", SetLastError=true)] static extern int CreatePseudoConsole(COORD size, SafeFileHandle inputRead, SafeFileHandle outputWrite, uint flags, out IntPtr pty);
    [DllImport("kernel32.dll")] static extern void ClosePseudoConsole(IntPtr pty);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr previous, IntPtr returnSize);
    [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] static extern bool CreateProcess(string app, string command, IntPtr pa, IntPtr ta, bool inherit, int flags, IntPtr env, string cwd, ref STARTUPINFOEX si, out PROCESS_INFORMATION pi);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool DeleteProcThreadAttributeList(IntPtr list);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr h, uint code);

    public static int Run(string exe, string args, string cwd, Action<string> output, Func<bool> cancelled) {
      SafeFileHandle inputRead, inputWrite, outputRead, outputWrite;
      if (!CreatePipe(out inputRead, out inputWrite, IntPtr.Zero, 0)) throw new Win32Exception();
      if (!CreatePipe(out outputRead, out outputWrite, IntPtr.Zero, 0)) throw new Win32Exception();
      SetHandleInformation(inputWrite, 1, 0); SetHandleInformation(outputRead, 1, 0);
      IntPtr pty; int ptyResult = CreatePseudoConsole(new COORD(120, 30), inputRead, outputWrite, 0, out pty);
      if (ptyResult != 0) throw new Win32Exception(ptyResult);
      IntPtr size=IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref size);
      var attrs=Marshal.AllocHGlobal(size); InitializeProcThreadAttributeList(attrs,1,0,ref size);
      var ptyPtr=Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(ptyPtr,pty);
      UpdateProcThreadAttribute(attrs,0,(IntPtr)PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,ptyPtr,(IntPtr)IntPtr.Size,IntPtr.Zero,IntPtr.Zero);
      var si=new STARTUPINFOEX(); si.StartupInfo.cb=Marshal.SizeOf<STARTUPINFOEX>(); si.lpAttributeList=attrs;
      var command = "\"" + exe.Replace("\"", "\\\"") + "\" " + args;
      PROCESS_INFORMATION pi;
      if (!CreateProcess(null,command,IntPtr.Zero,IntPtr.Zero,false,EXTENDED_STARTUPINFO_PRESENT|CREATE_UNICODE_ENVIRONMENT,IntPtr.Zero,cwd,ref si,out pi)) throw new Win32Exception();
      FileStream outputStream=new FileStream(new SafeFileHandle(outputRead.DangerousGetHandle(),true),FileAccess.Read);
      byte[] buffer=new byte[4096]; DateTime started=DateTime.UtcNow;
      while (true) {
        if (cancelled()) { TerminateProcess(pi.hProcess, 1); return 130; }
        if ((DateTime.UtcNow-started).TotalSeconds > 300) { TerminateProcess(pi.hProcess, 124); return 124; }
        if (outputStream.CanRead && outputStream.ReadTimeout >= 0) { var count=outputStream.Read(buffer,0,buffer.Length); if (count > 0) output(Encoding.UTF8.GetString(buffer,0,count)); }
        if (!Process.GetProcessById(pi.dwProcessId).HasExited) continue;
        break;
      }
      CloseHandle(pi.hThread); CloseHandle(pi.hProcess); DeleteProcThreadAttributeList(attrs); Marshal.FreeHGlobal(ptyPtr); Marshal.FreeHGlobal(attrs); ClosePseudoConsole(pty);
      outputStream.Dispose();
      return 0;
    }
  }
}
'@
}

if ($Mode -eq 'status') { Read-State | ConvertTo-Json -Depth 4; exit 0 }
if ($Mode -eq 'cancel') { $state=Read-State; if($state -and $state.pid){ Stop-Process -Id ([int]$state.pid) -Force -ErrorAction SilentlyContinue }; Write-State @{status='cancelled'; message='Device sign-in cancelled.'; sessionId=$SessionId}; exit 0 }
if ($Mode -eq 'validate') { Assert-Tooling; Ensure-ConPtyType; Write-Output 'forge ConPTY helper validated'; exit 0 }
Assert-Tooling
if ($Mode -eq 'start') {
    $SessionId = [Guid]::NewGuid().ToString('N')
    Write-State @{status='starting'; message='Starting gh device sign-in through ConPTY.'; sessionId=$SessionId}
    $args=@('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath,'-Mode','run','-StatePath',$StatePath,'-GhPath',$GhPath,'-SessionId',$SessionId)
    $child=Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WindowStyle Hidden -PassThru
    Write-State @{status='pending'; message='gh device sign-in is running through ConPTY.'; sessionId=$SessionId; pid=$child.Id}
    [Console]::Out.WriteLine($SessionId)
    exit 0
}

Sanitize-Environment
Ensure-ConPtyType
$state=Read-State
if (-not $state) { Write-State @{status='failed'; message='Device sign-in state is missing.'; sessionId=$SessionId}; exit 1 }
Write-State @{status='pending'; message='Waiting for the gh device code and approval.'; sessionId=$SessionId; pid=$PID}
$output = New-Object Text.StringBuilder
$cancelled = { $current=Read-State; return $current.status -eq 'cancelled' }
$reader = {
  param($text)
  if ($output.Length -lt $MaxOutputBytes) { [void]$output.Append($text.Substring(0,[Math]::Min($text.Length,$MaxOutputBytes-$output.Length))) }
  $url=[regex]::Match($output.ToString(),'https://github\.com/login/device\S*','IgnoreCase')
  $code=[regex]::Match($output.ToString(),'\b[A-Z0-9]{4}-[A-Z0-9]{4}\b')
  $current=Read-State
  if($url.Success){$current | Add-Member NoteProperty verificationUri $url.Value -Force}
  if($code.Success){$current | Add-Member NoteProperty userCode $code.Value -Force}
  $current.message='Open the displayed verification URL and enter the displayed user code.'
  Write-State ([hashtable]$current)
}
try {
  $exit = [DingForge.ConPty]::Run($GhPath,'auth login --web --hostname github.com --git-protocol https',$PWD.Path,$reader,$cancelled)
  $current=Read-State
  if($exit -eq 0){$current.status='completed';$current.message='gh device sign-in completed. Read gh auth status to prove keyring storage.'}elseif($exit -eq 130){$current.status='cancelled';$current.message='Device sign-in cancelled.'}else{$current.status='failed';$current.message="gh device sign-in ended with exit code $exit."}
  Write-State ([hashtable]$current)
} catch { Write-State @{status='failed'; message=$_.Exception.Message; sessionId=$SessionId} }
