[CmdletBinding()]
param(
    [ValidateSet('start','run','status','cancel','validate')]
    [string]$Mode = 'start',
    [Parameter(Mandatory=$true)][string]$StatePath,
    [Parameter(Mandatory=$true)][string]$GhPath,
    [string]$SessionId,
    [string]$OperationId,
    [string]$ExpiresAt
)

$ErrorActionPreference = 'Stop'
$MaxOutputBytes = 65536
$MaxStateBytes = 65536
$TimeoutSeconds = 300
$AuthVariables = @(
    'GH_HOST','GH_TOKEN','GITHUB_TOKEN','GH_ENTERPRISE_TOKEN','GITHUB_ENTERPRISE_TOKEN',
    'GITLAB_TOKEN','GIT_ASKPASS','GIT_CONFIG_COUNT','GIT_CONFIG_KEY_0','GIT_CONFIG_VALUE_0',
    'GIT_CONFIG_PARAMETERS','GIT_HTTP_EXTRAHEADER','GIT_SSH_COMMAND'
)

function Read-State {
    if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) { return $null }
    try {
        $text = Get-Content -Raw -LiteralPath $StatePath
        if ($text.Length -gt $MaxStateBytes) { return [pscustomobject]@{ status='corrupt'; corruption='The ConPTY state exceeded the bounded size.'; sessionId=$SessionId; operationId=$OperationId; revision=0 } }
        return $text | ConvertFrom-Json
    } catch {
        return [pscustomobject]@{ status='corrupt'; corruption='The ConPTY state was not valid JSON.'; sessionId=$SessionId; operationId=$OperationId; revision=0 }
    }
}

function Write-State([object]$State, [switch]$SingleOwner) {
    $parent = Split-Path -Parent $StatePath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $mutexName = 'Local\DingForgeState-' + (([BitConverter]::ToString(([Security.Cryptography.SHA256]::Create()).ComputeHash([Text.Encoding]::UTF8.GetBytes($StatePath)))).Replace('-', '').ToLowerInvariant())
    $mutex = [Threading.Mutex]::new($false, $mutexName)
    $held = $false
    try {
        $held = $mutex.WaitOne(5000)
        if (-not $held) { throw 'The ConPTY state CAS lock could not be acquired.' }
        try {
            $existing = Read-State
            if ($existing -and $existing.status -eq 'corrupt') { throw [string]$existing.corruption }
            $incomingSessionId = if ($State -is [hashtable]) { $State['sessionId'] } else { $State.sessionId }
            if ($existing -and $incomingSessionId -and $existing.sessionId -and [string]$existing.sessionId -ne [string]$incomingSessionId) { throw 'The ConPTY state belongs to a different session.' }
            $expectedRevision = $null
            if ($State -is [hashtable] -and $State.ContainsKey('expectedRevision')) { $expectedRevision = [long]$State['expectedRevision'] }
            elseif ($State -is [hashtable] -and $State.ContainsKey('revision')) { $expectedRevision = [long]$State['revision'] }
            elseif ($State -isnot [hashtable] -and $null -ne $State.revision) { $expectedRevision = [long]$State.revision }
            $actualRevision = if ($existing -and $null -ne $existing.revision) { [long]$existing.revision } else { 0L }
            if ($existing -and $null -eq $expectedRevision -and -not $SingleOwner) { throw 'The ConPTY state write omitted its expected revision.' }
            if ($null -ne $expectedRevision -and $actualRevision -ne $expectedRevision) { throw "The ConPTY state revision changed from expected $expectedRevision to actual $actualRevision." }
            $merged = @{}
            if ($existing) { foreach ($property in $existing.PSObject.Properties) { $merged[$property.Name] = $property.Value } }
            if ($State -is [hashtable]) { foreach ($key in $State.Keys) { $merged[$key] = $State[$key] } }
            else { foreach ($property in $State.PSObject.Properties) { $merged[$property.Name] = $property.Value } }
            $merged.Remove('expectedRevision')
            if (-not $merged.ContainsKey('sessionId') -and $SessionId) { $merged.sessionId = $SessionId }
            if ($OperationId -and -not $merged.operationId) { $merged.operationId = $OperationId }
            if ($ExpiresAt -and -not $merged.expiresAt) { $merged.expiresAt = $ExpiresAt }
            $oldRevision = 0L
            if ($merged.revision -as [long]) { $oldRevision = [long]$merged.revision }
            $merged.revision = $oldRevision + 1
            $tmp = "$StatePath.$PID.$([Guid]::NewGuid().ToString('N')).tmp"
            try {
                [IO.File]::WriteAllText($tmp, (($merged | ConvertTo-Json -Depth 6) + "`n"), [Text.UTF8Encoding]::new($false))
                for ($attempt = 1; $attempt -le 8; $attempt++) {
                    try { Move-Item -LiteralPath $tmp -Destination $StatePath -Force; return }
                    catch { if ($attempt -eq 8) { throw }; Start-Sleep -Milliseconds 40 }
                }
            } finally {
                if (Test-Path -LiteralPath $tmp -PathType Leaf) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
            }
        } finally {
            if ($held) { $mutex.ReleaseMutex() }
        }
    } finally {
        $mutex.Dispose()
    }
}

function Retire-Terminal-State {
    $mutexName = 'Local\DingForgeState-' + (([BitConverter]::ToString(([Security.Cryptography.SHA256]::Create()).ComputeHash([Text.Encoding]::UTF8.GetBytes($StatePath)))).Replace('-', '').ToLowerInvariant())
    $mutex = [Threading.Mutex]::new($false, $mutexName)
    $held = $false
    try {
        $held = $mutex.WaitOne(5000)
        if (-not $held) { throw 'The ConPTY state CAS lock could not be acquired for terminal retirement.' }
        $prior = Read-State
        if (-not $prior) { return }
        if (@('pending','starting') -contains [string]$prior.status) { throw 'A prior ConPTY device session is still pending.' }
        if ($prior.pid -and $prior.pidStartTicks -and (Test-ProcessIdentity ([int]$prior.pid) ([long]$prior.pidStartTicks))) { throw 'The prior ConPTY helper still has its recorded process identity.' }
        $retired = "$StatePath.retired.$([string]$prior.sessionId).$([string]$prior.revision).json"
        for ($attempt = 1; $attempt -le 8; $attempt++) {
            try {
                $redacted = @{
                    status = [string]$prior.status
                    sessionId = [string]$prior.sessionId
                    operationId = [string]$prior.operationId
                    revision = [long]$prior.revision
                    exitCode = if ($null -ne $prior.exitCode) { [int]$prior.exitCode } else { $null }
                    corruption = if ($prior.corruption) { [string]$prior.corruption } else { $null }
                    retiredAt = [DateTimeOffset]::UtcNow.ToString('o')
                    message = 'Terminal ConPTY state retained in redacted form.'
                }
                [IO.File]::WriteAllText($retired, (($redacted | ConvertTo-Json -Depth 4) + "`n"), [Text.UTF8Encoding]::new($false))
                Remove-Item -LiteralPath $StatePath -Force
                $retiredFiles = @(Get-ChildItem -LiteralPath (Split-Path -Parent $StatePath) -Filter ((Split-Path -Leaf $StatePath) + '.retired.*.json') -File | Sort-Object LastWriteTime -Descending)
                foreach ($old in ($retiredFiles | Select-Object -Skip 3)) { Remove-Item -LiteralPath $old.FullName -Force -ErrorAction SilentlyContinue }
                return
            }
            catch { if ($attempt -eq 8) { throw }; Start-Sleep -Milliseconds 40 }
        }
    } finally {
        if ($held) { $mutex.ReleaseMutex() }
        $mutex.Dispose()
    }
}

function Get-ProcessStartTicks([int]$ProcessId) {
    try { return (Get-Process -Id $ProcessId -ErrorAction Stop).StartTime.ToUniversalTime().Ticks } catch { return $null }
}

function Test-ProcessIdentity([int]$ProcessId, [long]$StartTicks) {
    $actual = Get-ProcessStartTicks $ProcessId
    return $null -ne $actual -and $actual -eq $StartTicks
}

function Sanitize-Environment {
    foreach ($name in $AuthVariables) { Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue }
    $env:GH_PROMPT_DISABLED = '0'
}

function Assert-Tooling {
    if ($GhPath -notmatch '^(?:[A-Za-z]:[\\/]|\\\\)' -or -not (Test-Path -LiteralPath $GhPath -PathType Leaf)) { throw 'The packaged gh executable is missing.' }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $GhPath).Hash.ToLowerInvariant()
    $expected = $env:DING_FORGE_GH_SHA256
    if ([string]::IsNullOrWhiteSpace($expected) -or $hash -ne $expected.ToLowerInvariant()) { throw 'The packaged gh executable digest does not match the approved manifest.' }
}

function Ensure-ConPtyType {
    if ('DingForge.ConPty' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

namespace DingForge {
  public static class ConPty {
    [StructLayout(LayoutKind.Sequential)] struct COORD { public short X; public short Y; public COORD(short x, short y) { X=x; Y=y; } }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO { public int cb; public string lpReserved; public string lpDesktop; public string lpTitle; public int dwX; public int dwY; public int dwXSize; public int dwYSize; public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute; public int dwFlags; public short wShowWindow; public short cbReserved2; public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError; }
    [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }
    const int EXTENDED_STARTUPINFO_PRESENT=0x00080000, CREATE_UNICODE_ENVIRONMENT=0x00000400, PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE=0x00020016;
    const uint WAIT_OBJECT_0=0;
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
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr h, out uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr h, uint milliseconds);

    public static int Run(string exe, string args, string cwd, Action<string> output, Func<bool> cancelled) {
      SafeFileHandle inputRead=null, inputWrite=null, outputRead=null, outputWrite=null;
      FileStream outputStream=null;
      IntPtr pty=IntPtr.Zero, attrs=IntPtr.Zero, ptyPtr=IntPtr.Zero;
      bool attrsInitialized=false, processStarted=false;
      PROCESS_INFORMATION pi=new PROCESS_INFORMATION();
      try {
        if (!CreatePipe(out inputRead, out inputWrite, IntPtr.Zero, 0)) throw new Win32Exception();
        if (!CreatePipe(out outputRead, out outputWrite, IntPtr.Zero, 0)) throw new Win32Exception();
        if (!SetHandleInformation(inputWrite, 1, 0) || !SetHandleInformation(outputRead, 1, 0)) throw new Win32Exception();
        int ptyResult=CreatePseudoConsole(new COORD(120,30),inputRead,outputWrite,0,out pty);
        if (ptyResult != 0) throw new Win32Exception(ptyResult);
        inputRead.Dispose(); inputRead=null; outputWrite.Dispose(); outputWrite=null;
        IntPtr size=IntPtr.Zero;
        InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);
        attrs=Marshal.AllocHGlobal(size);
        if (!InitializeProcThreadAttributeList(attrs,1,0,ref size)) throw new Win32Exception();
        attrsInitialized=true;
        ptyPtr=Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(ptyPtr,pty);
        if (!UpdateProcThreadAttribute(attrs,0,(IntPtr)PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,ptyPtr,(IntPtr)IntPtr.Size,IntPtr.Zero,IntPtr.Zero)) throw new Win32Exception();
        var si=new STARTUPINFOEX(); si.StartupInfo.cb=Marshal.SizeOf<STARTUPINFOEX>(); si.lpAttributeList=attrs;
        var command="\""+exe.Replace("\"","\\\"")+"\" "+args;
        if (!CreateProcess(null,command,IntPtr.Zero,IntPtr.Zero,false,EXTENDED_STARTUPINFO_PRESENT|CREATE_UNICODE_ENVIRONMENT,IntPtr.Zero,cwd,ref si,out pi)) throw new Win32Exception();
        processStarted=true;
        outputStream=new FileStream(outputRead,FileAccess.Read,4096,true); outputRead=null;
        byte[] buffer=new byte[4096]; DateTime deadline=DateTime.UtcNow.AddSeconds(300);
        Task<int> pendingRead=outputStream.ReadAsync(buffer,0,buffer.Length);
        while (true) {
          if (cancelled()) { TerminateProcess(pi.hProcess,1); return 130; }
          if (DateTime.UtcNow>=deadline) { TerminateProcess(pi.hProcess,124); return 124; }
          if (pendingRead.IsCompleted) {
            int count=pendingRead.GetAwaiter().GetResult();
            if (count>0) { output(Encoding.UTF8.GetString(buffer,0,count)); pendingRead=outputStream.ReadAsync(buffer,0,buffer.Length); continue; }
            break;
          }
          if (WaitForSingleObject(pi.hProcess,0)==WAIT_OBJECT_0) break;
          Task.WhenAny(pendingRead,Task.Delay(50)).GetAwaiter().GetResult();
        }
        uint exitCode;
        if (!GetExitCodeProcess(pi.hProcess,out exitCode)) throw new Win32Exception();
        return unchecked((int)exitCode);
      } finally {
        if (outputStream!=null) outputStream.Dispose(); else if (outputRead!=null) outputRead.Dispose();
        if (inputRead!=null) inputRead.Dispose(); if (inputWrite!=null) inputWrite.Dispose(); if (outputWrite!=null) outputWrite.Dispose();
        if (processStarted && pi.hThread!=IntPtr.Zero) CloseHandle(pi.hThread);
        if (processStarted && pi.hProcess!=IntPtr.Zero) CloseHandle(pi.hProcess);
        if (attrsInitialized) DeleteProcThreadAttributeList(attrs);
        if (ptyPtr!=IntPtr.Zero) Marshal.FreeHGlobal(ptyPtr);
        if (attrs!=IntPtr.Zero) Marshal.FreeHGlobal(attrs);
        if (pty!=IntPtr.Zero) ClosePseudoConsole(pty);
      }
    }
  }
}
'@
}

if ($Mode -eq 'status') { Read-State | ConvertTo-Json -Depth 6; exit 0 }
if ($Mode -eq 'cancel') {
    $state=Read-State
    if (-not $state -or $state.status -eq 'corrupt') { Write-Error 'The cancellation target state is missing or corrupt; no process was terminated.'; exit 2 }
if ([string]$state.sessionId -ne [string]$SessionId -or ($OperationId -and [string]$state.operationId -ne [string]$OperationId)) { Write-State @{status='unknown-side-effect'; message='The cancellation target was stale or could not be proven to be this session.'; sessionId=$SessionId; operationId=$OperationId; expectedRevision=[long]$state.revision}; exit 2 }
if ($state.pid -and $state.pidStartTicks -and (Test-ProcessIdentity ([int]$state.pid) ([long]$state.pidStartTicks))) { Stop-Process -Id ([int]$state.pid) -Force -ErrorAction SilentlyContinue; Write-State @{status='cancelled'; message='Device sign-in cancelled.'; sessionId=$SessionId; operationId=$OperationId; expectedRevision=[long]$state.revision}; exit 0 }
Write-State @{status='unknown-side-effect'; message='The cancellation target no longer has the recorded process identity.'; sessionId=$SessionId; operationId=$OperationId; expectedRevision=[long]$state.revision}; exit 2
}
if ($Mode -eq 'validate') { Assert-Tooling; Ensure-ConPtyType; Write-Output 'forge ConPTY helper validated'; exit 0 }
Assert-Tooling
if ($Mode -eq 'start') {
    $SessionId=[Guid]::NewGuid().ToString('N')
    Retire-Terminal-State
    Write-State @{status='starting'; message='Starting gh device sign-in through ConPTY.'; sessionId=$SessionId; operationId=$OperationId; expiresAt=$ExpiresAt} -SingleOwner
    $args=@('-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath,'-Mode','run','-StatePath',$StatePath,'-GhPath',$GhPath,'-SessionId',$SessionId,'-OperationId',$OperationId,'-ExpiresAt',$ExpiresAt)
    $child=Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WindowStyle Hidden -PassThru
    $starting = Read-State
    Write-State @{status='pending'; message='gh device sign-in is running through ConPTY.'; sessionId=$SessionId; operationId=$OperationId; expiresAt=$ExpiresAt; pid=$child.Id; pidStartTicks=(Get-ProcessStartTicks $child.Id); expectedRevision=[long]$starting.revision}
    [Console]::Out.WriteLine($SessionId)
    exit 0
}

Sanitize-Environment
Ensure-ConPtyType
$state=Read-State
if (-not $state -or $state.status -eq 'corrupt') { $stateMessage = if($state -and $state.corruption){$state.corruption}else{'Device sign-in state is missing.'}; Write-Error $stateMessage; exit 1 }
if ([string]$state.sessionId -ne [string]$SessionId -or ($OperationId -and [string]$state.operationId -ne [string]$OperationId)) { throw 'The ConPTY state session or operation id does not match.' }
Write-State @{status='pending'; message='Waiting for the gh device code and approval.'; sessionId=$SessionId; operationId=$OperationId; expiresAt=$ExpiresAt; pid=$PID; pidStartTicks=(Get-ProcessStartTicks $PID); expectedRevision=[long]$state.revision}
$env:GH_BROWSER='cmd.exe /d /c exit 0'
$env:BROWSER=$env:GH_BROWSER
$output=New-Object Text.StringBuilder
$cancelled={ $current=Read-State; return $current -and [string]$current.sessionId -eq [string]$SessionId -and [string]$current.operationId -eq [string]$OperationId -and $current.status -eq 'cancelled' }
$reader={
  param($text)
  $plain=[regex]::Replace($text,'\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\a]*(?:\a|\x1B\\))','')
  $plain=[regex]::Replace($plain,'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]','')
  if($output.Length -lt $MaxOutputBytes){[void]$output.Append($plain.Substring(0,[Math]::Min($plain.Length,$MaxOutputBytes-$output.Length)))}
  $url=[regex]::Match($output.ToString(),'https://github\.com/login/device(?:\?[A-Za-z0-9._~:/?#[\]@!$%+,;=-]*)?','IgnoreCase')
  $code=[regex]::Match($output.ToString(),'\b[A-Z0-9]{4}-[A-Z0-9]{4}\b')
  $current=Read-State
  if($url.Success){try{$uri=[Uri]$url.Value;if($uri.Scheme -eq 'https' -and $uri.Host -eq 'github.com' -and $uri.AbsolutePath -eq '/login/device' -and -not $uri.Fragment){$current | Add-Member NoteProperty verificationUri $uri.AbsoluteUri -Force}}catch{}}
  if($code.Success){$current | Add-Member NoteProperty userCode $code.Value -Force}
  $current.message='Open the displayed verification URL and enter the displayed user code.'
  Write-State ([hashtable]$current)
}
try {
  $exit=[DingForge.ConPty]::Run($GhPath,'auth login --web --hostname github.com --git-protocol https',$PWD.Path,$reader,$cancelled)
  $current=Read-State
  $current.exitCode=$exit
  if($exit -eq 0){$current.status='completed';$current.message='gh device sign-in completed. Read gh auth status to prove keyring storage.'}elseif($exit -eq 130){$current.status='cancelled';$current.message='Device sign-in cancelled.'}elseif($exit -eq 124){$current.status='unknown-side-effect';$current.message='The ConPTY device flow exceeded its deadline before the external outcome was known.'}else{$current.status='failed';$current.message="gh device sign-in ended with exit code $exit."}
  Write-State ([hashtable]$current)
} catch { $current = Read-State; if ($current -and $current.status -ne 'corrupt') { Write-State @{status='failed'; message=$_.Exception.Message; sessionId=$SessionId; operationId=$OperationId; expiresAt=$ExpiresAt; expectedRevision=[long]$current.revision} } else { Write-Error $_.Exception.Message } }
