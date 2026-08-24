param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$WorkerPath,
  [Parameter(Mandatory = $true)][long]$MemoryBytes,
  [Parameter(Mandatory = $true)][string]$ManifestPath,
  [Parameter(Mandatory = $true)][string]$PackageLockPath,
  [Parameter(Mandatory = $true)][long]$WorkerTimeoutMs,
  [Parameter(Mandatory = $true)][string]$ProfileName,
  [Parameter(Mandatory = $true)][string]$RecoveryPath,
  [Parameter(Mandatory = $true)][string]$RecoveryScriptPath
)

function Read-ProvenPath([string]$Path) {
  try {
    if (-not [IO.File]::Exists($Path)) { throw "missing" }
    $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    try { return $stream.Length } finally { $stream.Dispose() }
  } catch { throw "First inaccessible decoder path: $Path" }
}

function Get-TextHash([string]$Text) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
}

$supervisor = Get-Process -Id $PID -ErrorAction Stop
$supervisorCim = Get-CimInstance Win32_Process -Filter "ProcessId = $PID" -ErrorAction Stop
$resourceRoot = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($WorkerPath))
$recoveryNonce = [Guid]::NewGuid().ToString('N')

try {
  [void](Read-ProvenPath $NodePath)
  [void](Read-ProvenPath $WorkerPath)
  [void](Read-ProvenPath $ManifestPath)
  [void](Read-ProvenPath $PackageLockPath)
  $manifestText = [IO.File]::ReadAllText($ManifestPath)
  if ([Text.Encoding]::UTF8.GetByteCount($manifestText) -gt 1048576) { throw "The decoder manifest exceeds its startup bound." }
  $manifest = $manifestText | ConvertFrom-Json
  if ($manifest.schemaVersion -ne 1 -or $manifest.sourceCommit -notmatch '^[0-9a-f]{40}$' -or $manifest.sourceCommit -eq ('0' * 40) -or @($manifest.nativeFiles).Count -eq 0) { throw "The decoder manifest is missing a non-placeholder source commit or native runtime set." }
  $hash = (Get-FileHash -LiteralPath $WorkerPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($manifest.workerSha256 -ne $hash) { throw "The decoder worker digest does not match the manifest: $WorkerPath" }
  $hash = (Get-FileHash -LiteralPath $PackageLockPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($manifest.packageLockSha256 -ne $hash) { throw "The decoder package lock digest does not match the manifest: $PackageLockPath" }
  [void](Read-ProvenPath $PSCommandPath)
  $hash = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($manifest.launcherSha256 -ne $hash) { throw "The decoder launcher digest does not match the manifest: $PSCommandPath" }
  [void](Read-ProvenPath $RecoveryScriptPath)
  $recoveryHash = (Get-FileHash -LiteralPath $RecoveryScriptPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($manifest.recoverySha256 -ne $recoveryHash) { throw "The decoder recovery helper digest does not match the manifest: $RecoveryScriptPath" }
  foreach ($entry in @($manifest.nativeFiles)) {
    if ($entry.path -notmatch '^node_modules/(sharp|@img)/.+\.(js|mjs|cjs|node|dll|exe|so|dylib|wasm)$') { throw "The decoder manifest contains an invalid runtime path: $($entry.path)" }
    $candidate = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetDirectoryName($PackageLockPath)) ($entry.path -replace '/', '\')))
    [void](Read-ProvenPath $candidate)
    $expected = [string]$entry.sha256
    $actual = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw "The decoder native runtime digest does not match the manifest: $($entry.path)" }
  }
  $record = [ordered]@{
    schemaVersion = 1
    profileName = $ProfileName
    recoveryNonce = $recoveryNonce
    supervisorPid = $PID
    supervisorPath = $supervisor.Path
    supervisorStartToken = $supervisor.StartTime.ToUniversalTime().ToString('o')
    supervisorCreationTime = ([Management.ManagementDateTimeConverter]::ToDateTime([string]$supervisorCim.CreationDate)).ToUniversalTime().ToString('o')
    supervisorCommandHash = Get-TextHash ([string]$supervisorCim.CommandLine)
    recoveryScriptPath = [IO.Path]::GetFullPath($RecoveryScriptPath)
    recoveryScriptHash = $recoveryHash
    workerPid = 0
    workerPath = [IO.Path]::GetFullPath($WorkerPath)
    nodePath = [IO.Path]::GetFullPath($NodePath)
    workerCommandHash = ''
    acl = @(
      [ordered]@{ path = $resourceRoot; sddl = (Get-Acl -LiteralPath $resourceRoot).Sddl }
      [ordered]@{ path = [IO.Path]::GetFullPath($NodePath); sddl = (Get-Acl -LiteralPath ([IO.Path]::GetFullPath($NodePath))).Sddl }
    )
  }
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($RecoveryPath)) | Out-Null
  $record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $RecoveryPath -Encoding UTF8 -NoNewline
} catch {
  Write-Output "ERROR:STARTUP:$($_.Exception.Message)"
  exit 1
}

Add-Type @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class LogoWorkerAppContainerLauncher {
  const uint CREATE_SUSPENDED=0x4, EXTENDED_STARTUPINFO_PRESENT=0x80000, CREATE_UNICODE_ENVIRONMENT=0x400, STARTF_USESTDHANDLES=0x100, INFINITE=0xffffffff, HANDLE_FLAG_INHERIT=1;
  const uint PROCESS_MEMORY=0x100, KILL_ON_CLOSE=0x2000, WAIT_TIMEOUT=0x102;
  const uint SE_FILE_OBJECT=1, DACL_SECURITY_INFORMATION=4, GENERIC_READ=0x80000000, GENERIC_EXECUTE=0x20000000, OBJECT_INHERIT=1, CONTAINER_INHERIT=2, SET_ACCESS=2;
  [StructLayout(LayoutKind.Sequential)] struct SECURITY_CAPABILITIES { public IntPtr AppContainerSid; public IntPtr Capabilities; public uint CapabilityCount; public uint Reserved; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFO { public uint cb; public string lpReserved; public string lpDesktop; public string lpTitle; public uint dwX; public uint dwY; public uint dwXSize; public uint dwYSize; public uint dwXCountChars; public uint dwYCountChars; public uint dwFillAttribute; public uint dwFlags; public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public uint dwProcessId; public uint dwThreadId; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMITS { public uint LimitFlags; public UIntPtr MinWorkingSet; public UIntPtr MaxWorkingSet; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint Priority; public uint SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] struct IO_LIMITS { public UIntPtr Read; public UIntPtr Write; public UIntPtr Other; }
  [StructLayout(LayoutKind.Sequential)] struct JOB_LIMITS { public BASIC_LIMITS Basic; public IO_LIMITS Io; public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit; public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed; }
  [StructLayout(LayoutKind.Sequential)] struct TRUSTEE { public IntPtr MultipleTrustee; public int MultipleTrusteeOperation; public int TrusteeForm; public int TrusteeType; public IntPtr TrusteeName; }
  [StructLayout(LayoutKind.Sequential)] struct EXPLICIT_ACCESS { public uint AccessPermissions; public int AccessMode; public uint Inheritance; public TRUSTEE Trustee; }
  [DllImport("userenv.dll", CharSet=CharSet.Unicode)] static extern int CreateAppContainerProfile(string name,string display,string description,IntPtr capabilities,uint count,out IntPtr sid);
  [DllImport("userenv.dll")] static extern int DeleteAppContainerProfile(string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int infoClass,ref JOB_LIMITS limits,uint length);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref IntPtr size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,ref SECURITY_CAPABILITIES value,IntPtr size,IntPtr previous,IntPtr returnSize);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returnSize);
  [DllImport("kernel32.dll")] static extern bool DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string application,StringBuilder command,IntPtr processAttributes,IntPtr threadAttributes,bool inheritHandles,uint flags,IntPtr environment,string directory,ref STARTUPINFOEX startup,out PROCESS_INFORMATION processInfo);
  [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr handle,out uint code);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr handle,uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int handle);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetHandleInformation(IntPtr handle,out uint flags);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode)] static extern uint GetNamedSecurityInfo(string path,uint objectType,uint securityInfo,out IntPtr owner,out IntPtr group,out IntPtr dacl,out IntPtr sacl,out IntPtr descriptor);
  [DllImport("advapi32.dll",SetLastError=true)] static extern uint SetEntriesInAcl(uint count,ref EXPLICIT_ACCESS entries,IntPtr oldAcl,out IntPtr newAcl);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint SetNamedSecurityInfo(string path,uint objectType,uint securityInfo,IntPtr owner,IntPtr group,IntPtr dacl,IntPtr sacl);
  [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
  static string Quote(string value){return "\""+value.Replace("\"","\\\"")+"\"";}
  static void GrantResourceReadExecute(string path,IntPtr sid,out IntPtr descriptor,out IntPtr originalDacl,out IntPtr addedDacl){
    IntPtr owner,group,sacl; var result=GetNamedSecurityInfo(path,SE_FILE_OBJECT,DACL_SECURITY_INFORMATION,out owner,out group,out originalDacl,out sacl,out descriptor); if(result!=0) throw new Win32Exception((int)result,"GetNamedSecurityInfo failed");
    var entry=new EXPLICIT_ACCESS{AccessPermissions=GENERIC_READ|GENERIC_EXECUTE,AccessMode=(int)SET_ACCESS,Inheritance=OBJECT_INHERIT|CONTAINER_INHERIT,Trustee=new TRUSTEE{TrusteeForm=0,TrusteeName=sid}};
    result=SetEntriesInAcl(1,ref entry,originalDacl,out addedDacl); if(result!=0) throw new Win32Exception((int)result,"SetEntriesInAcl failed");
    result=SetNamedSecurityInfo(path,SE_FILE_OBJECT,DACL_SECURITY_INFORMATION,IntPtr.Zero,IntPtr.Zero,addedDacl,IntPtr.Zero); if(result!=0) throw new Win32Exception((int)result,"SetNamedSecurityInfo failed");
  }
  static void RestoreResourceDacl(string path,IntPtr originalDacl){ var result=SetNamedSecurityInfo(path,SE_FILE_OBJECT,DACL_SECURITY_INFORMATION,IntPtr.Zero,IntPtr.Zero,originalDacl,IntPtr.Zero); if(result!=0) throw new Win32Exception((int)result,"Restoring decoder resource ACL failed"); }
  static string Digest(string value){using(var sha=System.Security.Cryptography.SHA256.Create()){return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(value))).Replace("-","").ToLowerInvariant();}}
  static void UpdateRecovery(string path,uint pid,string command){var text=System.IO.File.ReadAllText(path);text=text.Replace("\"workerPid\": 0","\"workerPid\": "+pid).Replace("\"workerCommandHash\": \"\"","\"workerCommandHash\": \""+Digest(command)+"\"");System.IO.File.WriteAllText(path,text,new UTF8Encoding(false));}
  static bool CancelRequested(string path,string nonce){var cancel=path+".cancel"; return System.IO.File.Exists(cancel) && String.Equals(System.IO.File.ReadAllText(cancel),nonce,StringComparison.Ordinal);}
  static void Capture(ref Exception first,Action action){ try{action();}catch(Exception error){if(first==null)first=error;} }
  public static int Run(string profile,string recoveryPath,string recoveryNonce,string node,string worker,long memoryBytes,long workerTimeoutMs){
    IntPtr sid=IntPtr.Zero,job=IntPtr.Zero,attributes=IntPtr.Zero,resourceDescriptor=IntPtr.Zero,addedDacl=IntPtr.Zero,originalDacl=IntPtr.Zero,nodeDescriptor=IntPtr.Zero,nodeAddedDacl=IntPtr.Zero,nodeOriginalDacl=IntPtr.Zero; var resourceRoot=System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(worker)); if(String.IsNullOrEmpty(resourceRoot)) throw new InvalidOperationException("The decoder resource directory is unavailable"); PROCESS_INFORMATION pi=new PROCESS_INFORMATION(); int workerExit=1; Exception setupError=null,cleanupError=null;
    try{
      var hr=CreateAppContainerProfile(profile,profile,"Ding PBX Console local logo decoder",IntPtr.Zero,0,out sid);
      if(hr!=0 && hr!=unchecked((int)0x800700B7)) throw new Win32Exception(hr,"CreateAppContainerProfile failed");
      job=CreateJobObject(IntPtr.Zero,null); if(job==IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(),"CreateJobObject failed");
      var limits=new JOB_LIMITS(); limits.Basic.LimitFlags=PROCESS_MEMORY|KILL_ON_CLOSE; limits.ProcessMemoryLimit=new UIntPtr((ulong)memoryBytes);
      if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf<JOB_LIMITS>())) throw new Win32Exception(Marshal.GetLastWin32Error(),"SetInformationJobObject failed");
      IntPtr size=IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero,2,0,ref size); attributes=Marshal.AllocHGlobal(size);
      if(!InitializeProcThreadAttributeList(attributes,2,0,ref size)) throw new Win32Exception(Marshal.GetLastWin32Error(),"InitializeProcThreadAttributeList failed");
      var capabilities=new SECURITY_CAPABILITIES{AppContainerSid=sid,Capabilities=IntPtr.Zero,CapabilityCount=0,Reserved=0};
      if(!UpdateProcThreadAttribute(attributes,0,(IntPtr)0x00020009,ref capabilities,(IntPtr)Marshal.SizeOf<SECURITY_CAPABILITIES>(),IntPtr.Zero,IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error(),"UpdateProcThreadAttribute failed");
      GrantResourceReadExecute(resourceRoot,sid,out resourceDescriptor,out originalDacl,out addedDacl);
      GrantResourceReadExecute(System.IO.Path.GetFullPath(node),sid,out nodeDescriptor,out nodeOriginalDacl,out nodeAddedDacl);
      var startup=new STARTUPINFOEX(); startup.StartupInfo.cb=(uint)Marshal.SizeOf<STARTUPINFOEX>(); startup.StartupInfo.dwFlags=STARTF_USESTDHANDLES; startup.StartupInfo.hStdInput=GetStdHandle(-10); startup.StartupInfo.hStdOutput=GetStdHandle(-11); startup.StartupInfo.hStdError=GetStdHandle(-12); startup.lpAttributeList=attributes;
      if(startup.StartupInfo.hStdInput==IntPtr.Zero || startup.StartupInfo.hStdOutput==IntPtr.Zero || startup.StartupInfo.hStdError==IntPtr.Zero) throw new InvalidOperationException("The decoder pipe handles are unavailable");
      uint inputFlags,outputFlags,errorFlags; if(!GetHandleInformation(startup.StartupInfo.hStdInput,out inputFlags) || !GetHandleInformation(startup.StartupInfo.hStdOutput,out outputFlags) || !GetHandleInformation(startup.StartupInfo.hStdError,out errorFlags) || (inputFlags&HANDLE_FLAG_INHERIT)==0 || (outputFlags&HANDLE_FLAG_INHERIT)==0 || (errorFlags&HANDLE_FLAG_INHERIT)==0) throw new InvalidOperationException("The decoder pipe handles are not inheritable");
      var handles = new[] { startup.StartupInfo.hStdInput, startup.StartupInfo.hStdOutput, startup.StartupInfo.hStdError }; var pinnedHandles = GCHandle.Alloc(handles, GCHandleType.Pinned);
      try { if(!UpdateProcThreadAttribute(attributes,0,(IntPtr)0x00020002,pinnedHandles.AddrOfPinnedObject(),(IntPtr)(IntPtr.Size*handles.Length),IntPtr.Zero,IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error(),"UpdateProcThreadAttribute handle list failed"); } finally { pinnedHandles.Free(); }
      var commandText=Quote(node)+" --max-old-space-size=64 "+Quote(worker)+" --no-network";
      var command=new StringBuilder(commandText);
      if(!CreateProcess(null,command,IntPtr.Zero,IntPtr.Zero,true,CREATE_SUSPENDED|EXTENDED_STARTUPINFO_PRESENT|CREATE_UNICODE_ENVIRONMENT,IntPtr.Zero,null,ref startup,out pi)) throw new Win32Exception(Marshal.GetLastWin32Error(),"CreateProcess AppContainer worker failed");
      UpdateRecovery(recoveryPath,pi.dwProcessId,commandText);
      if(!AssignProcessToJobObject(job,pi.hProcess)) throw new Win32Exception(Marshal.GetLastWin32Error(),"AssignProcessToJobObject failed");
      if(ResumeThread(pi.hThread)==unchecked((uint)-1)) throw new Win32Exception(Marshal.GetLastWin32Error(),"ResumeThread failed");
      Console.Out.WriteLine("WORKER_PID:"+pi.dwProcessId); Console.Out.Flush(); var deadline=DateTime.UtcNow.AddMilliseconds(Math.Max(1,workerTimeoutMs)); uint waitResult=WAIT_TIMEOUT; while(waitResult==WAIT_TIMEOUT && DateTime.UtcNow<deadline){if(CancelRequested(recoveryPath,recoveryNonce)){if(!TerminateProcess(pi.hProcess,125)) throw new Win32Exception(Marshal.GetLastWin32Error(),"Terminating cancelled decoder worker failed"); workerExit=125; break;} waitResult=WaitForSingleObject(pi.hProcess,50);} if(workerExit!=125 && waitResult==WAIT_TIMEOUT){if(!TerminateProcess(pi.hProcess,124)) throw new Win32Exception(Marshal.GetLastWin32Error(),"Terminating timed-out decoder worker failed"); if(WaitForSingleObject(pi.hProcess,3000)==WAIT_TIMEOUT) throw new TimeoutException("The timed-out decoder worker did not exit.");} else if(workerExit!=125 && waitResult!=0) throw new Win32Exception("WaitForSingleObject failed"); uint exit; if(!GetExitCodeProcess(pi.hProcess,out exit)) throw new Win32Exception(Marshal.GetLastWin32Error(),"GetExitCodeProcess failed"); if(workerExit!=125) workerExit=(int)exit; Console.Out.WriteLine("WORKER_EXIT:"+workerExit); Console.Out.Flush();
    }catch(Exception error){setupError=error;}
    finally{
      Capture(ref cleanupError,()=>{if(pi.hProcess!=IntPtr.Zero){uint current; if(GetExitCodeProcess(pi.hProcess,out current) && current==259){if(!TerminateProcess(pi.hProcess,1)) throw new Win32Exception(Marshal.GetLastWin32Error(),"Terminating decoder worker failed"); if(WaitForSingleObject(pi.hProcess,3000)==0x102) throw new TimeoutException("The decoder worker did not exit after native termination.");}}});
      Capture(ref cleanupError,()=>{if(pi.hProcess!=IntPtr.Zero && !CloseHandle(pi.hProcess)) throw new Win32Exception(Marshal.GetLastWin32Error(),"Closing decoder worker handle failed");});
      Capture(ref cleanupError,()=>{if(pi.hThread!=IntPtr.Zero && !CloseHandle(pi.hThread)) throw new Win32Exception(Marshal.GetLastWin32Error(),"Closing decoder worker thread failed");});
      Capture(ref cleanupError,()=>{if(attributes!=IntPtr.Zero)DeleteProcThreadAttributeList(attributes);});
      Capture(ref cleanupError,()=>{if(attributes!=IntPtr.Zero)Marshal.FreeHGlobal(attributes);});
      Capture(ref cleanupError,()=>{if(nodeDescriptor!=IntPtr.Zero)RestoreResourceDacl(System.IO.Path.GetFullPath(node),nodeOriginalDacl);});
      Capture(ref cleanupError,()=>{if(nodeAddedDacl!=IntPtr.Zero)LocalFree(nodeAddedDacl);});
      Capture(ref cleanupError,()=>{if(nodeDescriptor!=IntPtr.Zero)LocalFree(nodeDescriptor);});
      Capture(ref cleanupError,()=>{if(resourceDescriptor!=IntPtr.Zero)RestoreResourceDacl(resourceRoot,originalDacl);});
      Capture(ref cleanupError,()=>{if(addedDacl!=IntPtr.Zero)LocalFree(addedDacl);});
      Capture(ref cleanupError,()=>{if(resourceDescriptor!=IntPtr.Zero)LocalFree(resourceDescriptor);});
      Capture(ref cleanupError,()=>{if(job!=IntPtr.Zero){if(!CloseHandle(job)) throw new Win32Exception(Marshal.GetLastWin32Error(),"Closing decoder Job Object failed"); Console.Out.WriteLine("JOB_CLEANUP_COMPLETE"); Console.Out.Flush();}});
      Capture(ref cleanupError,()=>{if(sid!=IntPtr.Zero){var result=DeleteAppContainerProfile(profile); if(result!=0) throw new Win32Exception(result,"Deleting decoder AppContainer profile failed");}});
    }
    if(cleanupError!=null){Console.Out.WriteLine("ERROR:CLEANUP:"+cleanupError.Message); Console.Out.Flush(); return 1;}
    if(setupError!=null){Console.Out.WriteLine("ERROR:"+setupError.Message); Console.Out.WriteLine("CLEANUP_COMPLETE"); Console.Out.Flush(); return 1;}
    Console.Out.WriteLine("CLEANUP_COMPLETE"); Console.Out.Flush(); return workerExit;
  }
}
"@

$exitCode = [LogoWorkerAppContainerLauncher]::Run($ProfileName, $RecoveryPath, $recoveryNonce, $NodePath, $WorkerPath, $MemoryBytes, $WorkerTimeoutMs)
if ($exitCode -eq 0) { Remove-Item -LiteralPath $RecoveryPath -Force -ErrorAction SilentlyContinue }
exit $exitCode
